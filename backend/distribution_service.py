from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any


GBIF_USER_AGENT = "guzaoshibie-desmid-map/1.0 (local research app)"
GBIF_TAXON_CACHE: dict[str, str] = {}


@dataclass(slots=True)
class DistributionRecord:
    id: str
    source: str
    sourceRecordId: str
    speciesName: str
    scientificName: str
    genus: str
    taxonKey: str | None
    latitude: float
    longitude: float
    country: str
    region: str
    locality: str
    eventDate: str
    waterType: str
    sampleCount: int | None
    confidence: float | None
    verificationStatus: str
    recordType: str
    imageUrl: str
    detailUrl: str


def fetch_json(url: str, timeout: int = 12) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": GBIF_USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _same_name(left: Any, right: Any) -> bool:
    return str(left or "").strip().casefold() == str(right or "").strip().casefold()


def _looks_like_desmid_taxon(item: dict[str, Any], scientific_name: str) -> bool:
    if item.get("rank") != "GENUS":
        return False
    if not (_same_name(item.get("canonicalName"), scientific_name) or _same_name(item.get("genus"), scientific_name)):
        return False
    lineage = " ".join(
        str(item.get(key) or "")
        for key in ("family", "order", "class", "phylum", "parent", "scientificName")
    ).casefold()
    return any(marker in lineage for marker in ("desmidiaceae", "desmidiales", "zygnematales", "zygnematophyceae", "conjugatophyceae"))


def resolveGbifTaxonKey(scientific_name: str) -> str | None:
    scientific_name = str(scientific_name or "").strip()
    if not scientific_name:
        return None
    cache_key = scientific_name.casefold()
    if cache_key in GBIF_TAXON_CACHE:
        return GBIF_TAXON_CACHE[cache_key]

    match_url = "https://api.gbif.org/v1/species/match?" + urllib.parse.urlencode(
        {"name": scientific_name, "rank": "GENUS"}
    )
    try:
        match = fetch_json(match_url)
        if match.get("matchType") != "HIGHERRANK" and _looks_like_desmid_taxon(match, scientific_name):
            taxon_key = str(match.get("usageKey") or match.get("genusKey") or "")
            if taxon_key:
                GBIF_TAXON_CACHE[cache_key] = taxon_key
                return taxon_key
    except Exception:
        pass

    search_url = "https://api.gbif.org/v1/species/search?" + urllib.parse.urlencode(
        {"q": scientific_name, "rank": "GENUS", "limit": 10}
    )
    try:
        payload = fetch_json(search_url)
    except Exception:
        return None

    for item in payload.get("results", []):
        if _looks_like_desmid_taxon(item, scientific_name):
            taxon_key = str(item.get("nubKey") or item.get("key") or item.get("genusKey") or "")
            if taxon_key:
                GBIF_TAXON_CACHE[cache_key] = taxon_key
                return taxon_key
    return None


def fetchGbifOccurrences(params: dict[str, Any]) -> list[dict[str, Any]]:
    scientific_name = params.get("scientificName") or params.get("species")
    taxon_key = params.get("taxonKey") or resolveGbifTaxonKey(str(scientific_name or ""))
    query = {
        "taxonKey": taxon_key,
        "country": params.get("country"),
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
        "limit": min(int(params.get("limit") or 100), 300),
        "offset": int(params.get("offset") or 0),
    }
    query = {key: value for key, value in query.items() if value not in {None, ""}}
    if not query.get("taxonKey") and scientific_name:
        query["scientificName"] = scientific_name
    url = f"https://api.gbif.org/v1/occurrence/search?{urllib.parse.urlencode(query)}"
    try:
        payload = fetch_json(url)
    except Exception:
        return []
    records = normalizeDistributionRecords(payload.get("results", []), source="GBIF")
    if scientific_name:
        records = [
            record
            for record in records
            if _same_name(record.get("genus"), scientific_name) or str(record.get("scientificName") or "").casefold().startswith(str(scientific_name).casefold())
        ]
    return records


def fetchINaturalistObservations(params: dict[str, Any]) -> list[dict[str, Any]]:
    query = {
        "taxon_name": params.get("scientificName") or params.get("species"),
        "place_id": params.get("place_id"),
        "d1": params.get("dateFrom"),
        "d2": params.get("dateTo"),
        "per_page": min(int(params.get("limit") or 100), 200),
        "page": int(params.get("page") or 1),
        "geo": "true",
    }
    query = {key: value for key, value in query.items() if value not in {None, ""}}
    url = f"https://api.inaturalist.org/v1/observations?{urllib.parse.urlencode(query)}"
    try:
        payload = fetch_json(url)
    except Exception:
        return []
    records = normalizeDistributionRecords(payload.get("results", []), source="iNaturalist")
    scientific_name = params.get("scientificName") or params.get("species")
    if scientific_name:
        records = [
            record
            for record in records
            if _same_name(record.get("genus"), scientific_name) or str(record.get("scientificName") or "").casefold().startswith(str(scientific_name).casefold())
        ]
    return records


def normalizeDistributionRecords(records: list[dict[str, Any]], source: str | None = None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for raw in records:
        item_source = source or raw.get("source") or "Unknown"
        if item_source == "GBIF":
            scientific = raw.get("scientificName") or raw.get("species") or ""
            normalized.append(
                asdict(
                    DistributionRecord(
                        id=f"gbif-{raw.get('key') or raw.get('sourceRecordId') or len(normalized)}",
                        source="GBIF",
                        sourceRecordId=str(raw.get("key") or raw.get("sourceRecordId") or ""),
                        speciesName=raw.get("vernacularName") or scientific.split(" ")[0] or "鼓藻记录",
                        scientificName=scientific,
                        genus=raw.get("genus") or scientific.split(" ")[0] or "Desmid",
                        taxonKey=str(raw.get("taxonKey") or ""),
                        latitude=float(raw.get("decimalLatitude") or raw.get("latitude") or 0),
                        longitude=float(raw.get("decimalLongitude") or raw.get("longitude") or 0),
                        country=raw.get("country") or "",
                        region=raw.get("stateProvince") or raw.get("region") or "",
                        locality=raw.get("locality") or "",
                        eventDate=str(raw.get("eventDate") or ""),
                        waterType=raw.get("waterType") or "未知",
                        sampleCount=None,
                        confidence=None,
                        verificationStatus="公开记录",
                        recordType="occurrence",
                        imageUrl="",
                        detailUrl=f"https://www.gbif.org/occurrence/{raw.get('key')}" if raw.get("key") else "",
                    )
                )
            )
        elif item_source == "iNaturalist":
            taxon = raw.get("taxon") or {}
            geojson = raw.get("geojson") or {}
            coordinates = geojson.get("coordinates") or [raw.get("longitude") or 0, raw.get("latitude") or 0]
            scientific = taxon.get("name") or raw.get("scientificName") or ""
            normalized.append(
                asdict(
                    DistributionRecord(
                        id=f"inat-{raw.get('id') or raw.get('sourceRecordId') or len(normalized)}",
                        source="iNaturalist",
                        sourceRecordId=str(raw.get("id") or raw.get("sourceRecordId") or ""),
                        speciesName=taxon.get("preferred_common_name") or raw.get("speciesName") or scientific.split(" ")[0],
                        scientificName=scientific,
                        genus=scientific.split(" ")[0] or raw.get("genus") or "Desmid",
                        taxonKey=str(taxon.get("id") or raw.get("taxonKey") or ""),
                        latitude=float(coordinates[1] or 0),
                        longitude=float(coordinates[0] or 0),
                        country=raw.get("place_guess") or raw.get("country") or "",
                        region=raw.get("region") or "",
                        locality=raw.get("locality") or raw.get("place_guess") or "",
                        eventDate=str(raw.get("observed_on") or raw.get("eventDate") or ""),
                        waterType=raw.get("waterType") or "未知",
                        sampleCount=None,
                        confidence=None,
                        verificationStatus="公开记录",
                        recordType="observation",
                        imageUrl=(raw.get("photos") or [{}])[0].get("url", "") if isinstance(raw.get("photos"), list) else "",
                        detailUrl=raw.get("uri") or "",
                    )
                )
            )
        else:
            normalized.append(raw)
    return [item for item in normalized if item.get("latitude") and item.get("longitude")]


def getDistributionRecords(conn: Any, filters: dict[str, Any]) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM distribution_records").fetchall()
    records = [dict(row) for row in rows]
    result: list[dict[str, Any]] = []
    for record in records:
        if filters.get("species") and filters["species"] != "全部" and record["genus"] != filters["species"]:
            continue
        if filters.get("source") and filters["source"] != "全部" and record["source"] != filters["source"]:
            continue
        if filters.get("waterType") and filters["waterType"] != "全部" and record["waterType"] != filters["waterType"]:
            continue
        if filters.get("status") and filters["status"] != "全部" and record["verificationStatus"] != filters["status"]:
            continue
        if not _inside_bounds(record, filters):
            continue
        result.append(record)
    return result


def getSpeciesDistributionSummary(records: list[dict[str, Any]], species: str = "全部") -> dict[str, Any]:
    target = [record for record in records if species == "全部" or record.get("genus") == species]
    return {
        "species": species,
        "total": len(target),
        "publicRecords": sum(1 for record in target if record.get("source") in {"GBIF", "iNaturalist"}),
        "localRecords": sum(1 for record in target if record.get("source") in {"LocalSampling", "人工导入"}),
        "mainRegions": _top_values(target, "region")[:5],
        "waterTypes": _top_values(target, "waterType")[:5],
        "latestRecord": max((record.get("eventDate") or "" for record in target), default=""),
    }


def getRegionDistributionSummary(records: list[dict[str, Any]], bounds: dict[str, Any] | None = None) -> dict[str, Any]:
    scoped = [record for record in records if _inside_bounds(record, bounds or {})]
    return {
        "total": len(scoped),
        "regions": _top_values(scoped, "region"),
        "species": _top_values(scoped, "genus"),
        "sources": _top_values(scoped, "source"),
    }


def cacheDistributionRecords(conn: Any, records: list[dict[str, Any]]) -> int:
    count = 0
    for record in records:
        conn.execute(
            """
            INSERT OR REPLACE INTO distribution_records (
                id, source, sourceRecordId, speciesName, scientificName, genus,
                taxonKey, latitude, longitude, country, region, locality,
                eventDate, waterType, sampleCount, confidence, verificationStatus,
                recordType, imageUrl, detailUrl, syncedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.get("id"),
                record.get("source"),
                record.get("sourceRecordId"),
                record.get("speciesName"),
                record.get("scientificName"),
                record.get("genus"),
                record.get("taxonKey"),
                record.get("latitude"),
                record.get("longitude"),
                record.get("country"),
                record.get("region"),
                record.get("locality"),
                record.get("eventDate"),
                record.get("waterType"),
                record.get("sampleCount"),
                record.get("confidence"),
                record.get("verificationStatus"),
                record.get("recordType"),
                record.get("imageUrl"),
                record.get("detailUrl"),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        count += 1
    return count


def mergeLocalSamplingRecords(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return normalizeDistributionRecords(records, source="LocalSampling")


def to_geojson(records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [record["longitude"], record["latitude"]]},
                "properties": record,
            }
            for record in records
        ],
    }


def _inside_bounds(record: dict[str, Any], filters: dict[str, Any]) -> bool:
    try:
        south = float(filters.get("south", -90))
        west = float(filters.get("west", -180))
        north = float(filters.get("north", 90))
        east = float(filters.get("east", 180))
    except (TypeError, ValueError):
        return True
    return south <= float(record.get("latitude") or 0) <= north and west <= float(record.get("longitude") or 0) <= east


def _top_values(records: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for record in records:
        value = str(record.get(key) or "未记录")
        counts[value] = counts.get(value, 0) + 1
    return [{"label": key, "value": value} for key, value in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


# Snake-case aliases for internal Python callers.
fetch_gbif_occurrences = fetchGbifOccurrences
fetch_inaturalist_observations = fetchINaturalistObservations
normalize_distribution_records = normalizeDistributionRecords
get_distribution_records = getDistributionRecords
get_species_distribution_summary = getSpeciesDistributionSummary
get_region_distribution_summary = getRegionDistributionSummary
cache_distribution_records = cacheDistributionRecords
merge_local_sampling_records = mergeLocalSamplingRecords
