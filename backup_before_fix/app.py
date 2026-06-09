from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import http.client
import io
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib import error as urlerror, request as urlrequest

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat
from werkzeug.utils import secure_filename

from data.desmid_catalog import DESMID_CATALOG, catalog_as_list, get_species_profile
from distribution_service import (
    cacheDistributionRecords,
    fetchGbifOccurrences,
    fetchINaturalistObservations,
    getDistributionRecords,
    getRegionDistributionSummary,
    getSpeciesDistributionSummary,
    to_geojson,
)


BASE_DIR = Path(__file__).resolve().parent


def load_local_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        item = line.strip()
        if not item or item.startswith("#") or "=" not in item:
            continue
        key, value = item.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env_file(BASE_DIR / ".env")

UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = UPLOAD_DIR / "results"
PRIMARY_MODEL_PATH = Path(r"D:\guzhao_v4_best.pt")
FALLBACK_MODEL_PATH = Path(r"D:\xclabel-master\runs\train\guzhao_v4_manual2\weights\best.pt")
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "guzao.sqlite3"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
DEFAULT_CONFIDENCE = 0.25
DEEPSEEK_API_BASE_URL = os.environ.get("DEEPSEEK_API_BASE_URL", "https://api.deepseek.com").rstrip("/")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
DEEPSEEK_TIMEOUT_SECONDS = float(os.environ.get("DEEPSEEK_TIMEOUT_SECONDS", "12"))
AI_RECOGNITION_API_BASE_URL = os.environ.get("AI_RECOGNITION_API_BASE_URL", DEEPSEEK_API_BASE_URL).rstrip("/")
AI_RECOGNITION_API_URL = os.environ.get("AI_RECOGNITION_API_URL", f"{AI_RECOGNITION_API_BASE_URL}/chat/completions")
AI_RECOGNITION_MODEL = os.environ.get("AI_RECOGNITION_MODEL", os.environ.get("DEEPSEEK_RECOGNITION_MODEL", DEEPSEEK_MODEL))
AI_RECOGNITION_TIMEOUT_SECONDS = float(os.environ.get("AI_RECOGNITION_TIMEOUT_SECONDS", str(DEEPSEEK_TIMEOUT_SECONDS)))
AI_RECOGNITION_WITH_IMAGE = os.environ.get("AI_RECOGNITION_WITH_IMAGE", "").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
DESMID_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
AUTH_SESSION_HOURS = int(os.environ.get("AUTH_SESSION_HOURS", "12"))
AUTH_REMEMBER_DAYS = int(os.environ.get("AUTH_REMEMBER_DAYS", "30"))
USERNAME_PATTERN = re.compile(r"^[0-9A-Za-z_\-.@\u4e00-\u9fff]{3,32}$")

YOLO_CLASS_NAMES = [
    "辐射鼓藻属",
    "似竹鼓藻属",
    "新月藻属",
    "鼓藻属",
    "胶球鼓藻属",
    "柱胞鼓藻属",
    "角丝鼓藻属",
    "基纹鼓藻属",
    "凹顶鼓藻属",
    "棒形鼓藻属",
    "Haplotaenium",
    "Heimansia",
    "圆丝鼓藻属",
    "中带鼓藻属",
    "微星鼓藻属",
    "梭形鼓藻属",
    "柱形鼓藻属",
    "宽带鼓藻属",
    "弯柱鼓藻属",
    "瘤接鼓藻属",
    "螺带鼓藻属",
    "顶接鼓藻属",
    "角星鼓藻属",
    "叉星鼓藻属",
    "泰林鼓藻属",
    "裂顶鼓藻属",
    "Tortitaenia",
    "多棘鼓藻属",
    "棘接鼓藻属",
    "角顶鼓藻属",
    "瘤丝鼓藻属",
    "扭丝鼓藻属",
    "曲膝鼓藻属",
    "三顶鼓藻属",
    "弯丝鼓藻属",
]

DESMID_GENERA = [
    {"id": "actinotaenium", "scientific_genus": "Actinotaenium", "chinese_name": "辐射鼓藻属"},
    {"id": "bambusina", "scientific_genus": "Bambusina", "chinese_name": "似竹鼓藻属"},
    {"id": "closterium", "scientific_genus": "Closterium", "chinese_name": "新月藻属"},
    {"id": "cosmarium", "scientific_genus": "Cosmarium", "chinese_name": "鼓藻属"},
    {"id": "cosmocladium", "scientific_genus": "Cosmocladium", "chinese_name": "胶球鼓藻属"},
    {"id": "cylindrocystis", "scientific_genus": "", "chinese_name": "柱胞鼓藻属"},
    {"id": "desmidium", "scientific_genus": "Desmidium", "chinese_name": "角丝鼓藻属"},
    {"id": "docidium", "scientific_genus": "Docidium", "chinese_name": "基纹鼓藻属"},
    {"id": "euastrum", "scientific_genus": "Euastrum", "chinese_name": "凹顶鼓藻属"},
    {"id": "gonatozygon", "scientific_genus": "Gonatozygon", "chinese_name": "棒形鼓藻属"},
    {"id": "haplotaenium", "scientific_genus": "Haplotaenium", "chinese_name": "Haplotaenium"},
    {"id": "heimansia", "scientific_genus": "Heimansia", "chinese_name": "Heimansia"},
    {"id": "hyalotheca", "scientific_genus": "Hyalotheca", "chinese_name": "圆丝鼓藻属"},
    {"id": "mesotaenium", "scientific_genus": "Mesotaenium", "chinese_name": "中带鼓藻属"},
    {"id": "micrasterias", "scientific_genus": "Micrasterias", "chinese_name": "微星鼓藻属"},
    {"id": "netrium", "scientific_genus": "Netrium", "chinese_name": "梭形鼓藻属"},
    {"id": "penium", "scientific_genus": "Penium", "chinese_name": "柱形鼓藻属"},
    {"id": "pleurotaenium", "scientific_genus": "Pleurotaenium", "chinese_name": "宽带鼓藻属"},
    {"id": "roy", "scientific_genus": "Roy", "chinese_name": "弯柱鼓藻属"},
    {"id": "sphaerozosma", "scientific_genus": "Sphaerozosma", "chinese_name": "瘤接鼓藻属"},
    {"id": "spirotaenia", "scientific_genus": "Spirotaenia", "chinese_name": "螺带鼓藻属"},
    {"id": "spondylosium", "scientific_genus": "Spondylosium", "chinese_name": "顶接鼓藻属"},
    {"id": "staurastrum", "scientific_genus": "Staurastrum", "chinese_name": "角星鼓藻属"},
    {"id": "staurodesmus", "scientific_genus": "Staurodesmus", "chinese_name": "叉星鼓藻属"},
    {"id": "teilingia", "scientific_genus": "Teilingia", "chinese_name": "泰林鼓藻属"},
    {"id": "tetmemorus", "scientific_genus": "Tetmemorus", "chinese_name": "裂顶鼓藻属"},
    {"id": "tortitaenia", "scientific_genus": "Tortitaenia", "chinese_name": "Tortitaenia"},
    {"id": "xanthidium", "scientific_genus": "Xanthidium", "chinese_name": "多棘鼓藻属"},
    {"id": "spiny-joint", "scientific_genus": "", "chinese_name": "棘接鼓藻属"},
    {"id": "angular-apex", "scientific_genus": "", "chinese_name": "角顶鼓藻属"},
    {"id": "phymatodocis", "scientific_genus": "", "chinese_name": "瘤丝鼓藻属"},
    {"id": "twisted-thread", "scientific_genus": "", "chinese_name": "扭丝鼓藻属"},
    {"id": "bent-knee", "scientific_genus": "", "chinese_name": "曲膝鼓藻属"},
    {"id": "triplastrum", "scientific_genus": "", "chinese_name": "三顶鼓藻属"},
    {"id": "curved-thread", "scientific_genus": "", "chinese_name": "弯丝鼓藻属"},
]

CATALOG_LABEL_ALIASES = {
    "新月藻属": "closterium",
    "鼓藻属": "cosmarium",
    "角星鼓藻属": "micrasterias",
    "cosmarium": "cosmarium",
    "closterium": "closterium",
    "micrasterias": "micrasterias",
}


def resolve_model_path() -> Path:
    env_path = os.environ.get("GUZAO_MODEL_PATH")
    candidates = [
        Path(env_path) if env_path else None,
        PRIMARY_MODEL_PATH,
        FALLBACK_MODEL_PATH,
        BASE_DIR / "models" / "best.pt",
    ]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    return Path(env_path) if env_path else PRIMARY_MODEL_PATH


MODEL_PATH = resolve_model_path()

UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

_yolo_model: Any | None = None
_yolo_load_error: str | None = None
_yolo_device: int | str = "cpu"
_desmid_image_cache: dict[str, Any] | None = None
_desmid_image_lookup: dict[str, Path] = {}


@dataclass(slots=True)
class SampleRecord:
    id: str
    sample_code: str
    image_name: str
    image_url: str
    sampling_location: str
    water_type: str
    microscope_magnification: str
    staining_method: str
    capture_device: str
    species: str
    scientific_name: str
    confidence: float
    top_candidates: list[dict[str, Any]]
    morphology: dict[str, Any]
    processing_time: str
    review_status: str
    in_training_set: bool
    remark: str
    created_at: str


@dataclass(slots=True)
class SamplingSite:
    id: str
    name: str
    gps: str
    water_type: str
    latest_sampling_time: str
    sample_count: int
    dominant_group: str
    trend: str


@dataclass(slots=True)
class SpeciesInfo:
    id: str
    name: str
    scientific_name: str
    morphology_type: str
    cell_structure: str
    habitat: str
    ecological_indicator: str
    training_samples: int
    model_accuracy: float


@dataclass(slots=True)
class BatchTask:
    id: str
    total_images: int
    recognized: int
    failed: int
    low_confidence: int
    review_pending: int
    result_json: list[dict[str, Any]]
    created_at: str


@dataclass(slots=True)
class ModelVersion:
    id: str
    version: str
    trained_at: str
    category_count: int
    sample_count: int
    accuracy: float
    is_current: bool


@dataclass(slots=True)
class TrainingDataset:
    id: str
    category: str
    train_count: int
    validation_count: int
    test_count: int
    accuracy: float
    most_confused_with: str


@dataclass(slots=True)
class ReviewRecord:
    id: str
    sample_record_id: str
    result_id: str
    verdict: str
    reviewer: str
    note: str
    add_to_training: bool
    created_at: str


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


def now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def auth_expiry_text(remember: bool = True) -> str:
    delta = timedelta(days=AUTH_REMEMBER_DAYS) if remember else timedelta(hours=AUTH_SESSION_HOURS)
    return (datetime.now() + delta).strftime("%Y-%m-%d %H:%M:%S")


def is_expired_text(value: str | None) -> bool:
    if not value:
        return False
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S") < datetime.now()
    except ValueError:
        return False


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                token TEXT,
                token_expires_at TEXT,
                last_login_at TEXT,
                login_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                species TEXT NOT NULL,
                scientific_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                image_filename TEXT NOT NULL,
                image_url TEXT NOT NULL,
                quality_score REAL NOT NULL,
                inference_mode TEXT NOT NULL,
                report_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id TEXT PRIMARY KEY,
                result_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                verdict TEXT NOT NULL,
                note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS sample_records (
                id TEXT PRIMARY KEY,
                sample_code TEXT NOT NULL,
                user_id TEXT,
                image_name TEXT NOT NULL,
                image_url TEXT NOT NULL,
                sampling_site_id TEXT,
                sampling_location TEXT,
                water_type TEXT,
                microscope_magnification TEXT,
                staining_method TEXT,
                capture_device TEXT,
                species TEXT NOT NULL,
                scientific_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                top_candidates_json TEXT NOT NULL,
                morphology_json TEXT NOT NULL,
                processing_time TEXT,
                review_status TEXT NOT NULL,
                in_training_set INTEGER NOT NULL DEFAULT 0,
                source_report_id TEXT,
                remark TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sampling_sites (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                gps TEXT,
                water_type TEXT,
                latest_sampling_time TEXT,
                sample_count INTEGER NOT NULL DEFAULT 0,
                dominant_group TEXT,
                trend TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS species_info (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                scientific_name TEXT NOT NULL,
                morphology_type TEXT,
                cell_structure TEXT,
                typical_morphology TEXT,
                similar_species_json TEXT NOT NULL,
                identification_difficulty TEXT,
                habitat TEXT,
                ecological_indicator TEXT,
                training_samples INTEGER NOT NULL DEFAULT 0,
                model_accuracy REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS batch_tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                total_images INTEGER NOT NULL DEFAULT 0,
                recognized INTEGER NOT NULL DEFAULT 0,
                failed INTEGER NOT NULL DEFAULT 0,
                low_confidence INTEGER NOT NULL DEFAULT 0,
                review_pending INTEGER NOT NULL DEFAULT 0,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS model_versions (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                trained_at TEXT NOT NULL,
                category_count INTEGER NOT NULL,
                sample_count INTEGER NOT NULL,
                accuracy REAL NOT NULL,
                is_current INTEGER NOT NULL DEFAULT 0,
                metrics_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS training_datasets (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                train_count INTEGER NOT NULL DEFAULT 0,
                validation_count INTEGER NOT NULL DEFAULT 0,
                test_count INTEGER NOT NULL DEFAULT 0,
                accuracy REAL NOT NULL DEFAULT 0,
                most_confused_with TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS review_records (
                id TEXT PRIMARY KEY,
                sample_record_id TEXT NOT NULL,
                result_id TEXT,
                user_id TEXT,
                reviewer TEXT,
                verdict TEXT NOT NULL,
                note TEXT,
                add_to_training INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS distribution_records (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                sourceRecordId TEXT,
                speciesName TEXT,
                scientificName TEXT,
                genus TEXT,
                taxonKey TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                country TEXT,
                region TEXT,
                locality TEXT,
                eventDate TEXT,
                waterType TEXT,
                sampleCount INTEGER,
                confidence REAL,
                verificationStatus TEXT,
                recordType TEXT,
                imageUrl TEXT,
                detailUrl TEXT,
                syncedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS desmid_genera (
                id TEXT PRIMARY KEY,
                scientific_genus TEXT,
                chinese_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                source_note TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        ensure_user_auth_columns(conn)
        seed_desmid_genera(conn)
        remove_seed_data(conn)


def ensure_user_auth_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "token_expires_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN token_expires_at TEXT")
    if "last_login_at" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")
    if "login_count" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0")


def seed_desmid_genera(conn: sqlite3.Connection) -> None:
    timestamp = now_text()
    for item in DESMID_GENERA:
        display_name = (
            f"{item['scientific_genus']} {item['chinese_name']}"
            if item["scientific_genus"] and item["scientific_genus"] != item["chinese_name"]
            else item["chinese_name"]
        )
        conn.execute(
            """
            INSERT INTO desmid_genera (
                id, scientific_genus, chinese_name, display_name, source_note, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                scientific_genus = excluded.scientific_genus,
                chinese_name = excluded.chinese_name,
                display_name = excluded.display_name,
                source_note = excluded.source_note,
                updated_at = excluded.updated_at
            """,
            (
                item["id"],
                item["scientific_genus"],
                item["chinese_name"],
                display_name,
                "用户提供的鼓藻属名录截图导入；未填写拉丁属名的条目不做推断。",
                timestamp,
            ),
        )


def remove_seed_data(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM records WHERE inference_mode <> 'yolo'")
    conn.execute("DELETE FROM distribution_records WHERE id LIKE 'gbif-00%' OR id LIKE 'inat-00%' OR id LIKE 'local-00%' OR id LIKE 'manual-00%'")
    conn.execute("DELETE FROM sample_records WHERE user_id = 'seed'")
    conn.execute("DELETE FROM sample_records WHERE source_report_id NOT IN (SELECT id FROM records)")
    conn.execute("DELETE FROM sampling_sites WHERE id LIKE 'SITE-%'")
    conn.execute("DELETE FROM batch_tasks WHERE user_id = 'seed' OR id LIKE 'BAT-SEED-%'")
    conn.execute("DELETE FROM model_versions WHERE id LIKE 'MV-%'")
    conn.execute("DELETE FROM training_datasets WHERE id LIKE 'DS-%'")


init_db()


def row_to_user(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user.get("display_name") or user["username"],
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at"),
        "login_count": int(user.get("login_count") or 0),
        "token_expires_at": user.get("token_expires_at"),
    }


def anonymous_user() -> dict[str, Any]:
    return {
        "id": "anonymous",
        "username": "anonymous",
        "display_name": "未登录用户",
        "created_at": None,
    }


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return salt, digest.hex()


def find_user_by_username(username: str) -> dict[str, Any] | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(username) = lower(?)", (username,)).fetchone()
    return row_to_user(row)


def validate_auth_payload(username: str, password: str, display_name: str = "", registering: bool = False) -> str | None:
    if not USERNAME_PATTERN.fullmatch(username):
        return "用户名需为 3-32 个字符，可使用中文、字母、数字、下划线、短横线、点号或 @。"
    if len(password) < 6:
        return "密码至少需要 6 个字符。"
    if len(password) > 72:
        return "密码不能超过 72 个字符。"
    if registering and display_name and len(display_name) > 24:
        return "显示名称不能超过 24 个字符。"
    return None


def current_user() -> dict[str, Any] | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header.removeprefix("Bearer ").strip()
    if not token:
        return None
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE token = ?", (token,)).fetchone()
        user = row_to_user(row)
        if user and is_expired_text(user.get("token_expires_at")):
            conn.execute("UPDATE users SET token = NULL, token_expires_at = NULL WHERE id = ?", (user["id"],))
            return None
    return user


def require_user() -> tuple[dict[str, Any] | None, Any | None]:
    user = current_user()
    if user is None:
        return None, (jsonify({"error": "请先登录后再使用识别功能。"}), 401)
    return user, None


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def clamp(value: float, lower: float = 0, upper: float = 1) -> float:
    return max(lower, min(upper, value))


def level_from_score(score: float) -> str:
    if score >= 86:
        return "优秀"
    if score >= 72:
        return "良好"
    if score >= 58:
        return "可用"
    return "需重拍"


def confidence_level(confidence: float) -> str:
    if confidence >= 0.9:
        return "高可信"
    if confidence >= 0.75:
        return "中等可信"
    return "建议人工复核"


def inspect_image(image_path: Path) -> dict[str, Any]:
    with Image.open(image_path) as image:
        image = image.convert("RGB")
        width, height = image.size
        gray = ImageOps.grayscale(image)
        stat = ImageStat.Stat(gray)
        brightness = stat.mean[0] / 255
        contrast = min(stat.stddev[0] / 70, 1)
        edge_image = gray.filter(ImageFilter.FIND_EDGES)
        edge_score = min(ImageStat.Stat(edge_image).mean[0] / 5, 1)
        resolution_score = min((width * height) / (600 * 450), 1)

    brightness_score = 1 - min(abs(brightness - 0.45) / 0.45, 1)
    quality_score = round(
        (resolution_score * 0.28 + brightness_score * 0.22 + contrast * 0.24 + edge_score * 0.26) * 100
    )

    recommendations: list[str] = []
    if resolution_score < 0.55:
        recommendations.append("图片分辨率偏低，建议保留完整细胞轮廓后重新拍摄。")
    if brightness < 0.25:
        recommendations.append("画面偏暗，建议提高显微镜光源或延长曝光。")
    if brightness > 0.78:
        recommendations.append("画面偏亮，建议降低光源强度以保留细胞边缘。")
    if contrast < 0.35:
        recommendations.append("背景与细胞对比度偏低，建议调节焦距、光圈或染色/光照条件。")
    if edge_score < 0.32:
        recommendations.append("边缘清晰度偏低，建议重新对焦后上传。")
    if not recommendations:
        recommendations.append("图像质量较稳定，适合进行鼓藻形态识别。")

    return {
        "width": width,
        "height": height,
        "megapixels": round(width * height / 1_000_000, 2),
        "brightness": round(brightness, 3),
        "contrast": round(contrast, 3),
        "edge_score": round(edge_score, 3),
        "resolution_score": round(resolution_score, 3),
        "quality_score": quality_score,
        "quality_level": level_from_score(quality_score),
        "recommendations": recommendations,
        "metrics": [
            {"label": "分辨率", "score": round(resolution_score, 3), "value": f"{width} x {height}"},
            {"label": "亮度均衡", "score": round(brightness_score, 3), "value": f"{round(brightness * 100)}%"},
            {"label": "对比度", "score": round(contrast, 3), "value": f"{round(contrast * 100)}%"},
            {"label": "边缘清晰", "score": round(edge_score, 3), "value": f"{round(edge_score * 100)}%"},
        ],
    }


def get_yolo_model(strict: bool = False) -> Any | None:
    global _yolo_model, _yolo_load_error, _yolo_device
    if _yolo_model is not None:
        return _yolo_model
    if not MODEL_PATH.exists():
        _yolo_load_error = f"模型文件不存在，请检查 {MODEL_PATH}"
        if strict:
            raise FileNotFoundError(_yolo_load_error)
        return None

    try:
        from ultralytics import YOLO
        import torch

        _yolo_device = 0 if torch.cuda.is_available() else "cpu"
        _yolo_model = YOLO(str(MODEL_PATH))
        if _yolo_device == 0:
            _yolo_model.to("cuda:0")
        _yolo_load_error = None
        return _yolo_model
    except Exception as exc:  # pragma: no cover - optional dependency path
        _yolo_load_error = f"YOLO 模型加载失败：{exc}"
        if strict:
            raise RuntimeError(_yolo_load_error) from exc
        return None


def parse_confidence(default: float = DEFAULT_CONFIDENCE) -> float:
    raw_value = request.form.get("conf") or request.form.get("confidence") or request.args.get("conf")
    if raw_value in (None, ""):
        return default
    try:
        return clamp(float(raw_value), 0.01, 0.99)
    except (TypeError, ValueError):
        return default


def class_label(class_id: int, names: Any) -> str:
    raw_label = ""
    if isinstance(names, dict):
        raw_label = str(names.get(class_id, "")).strip()
    elif isinstance(names, (list, tuple)) and 0 <= class_id < len(names):
        raw_label = str(names[class_id]).strip()

    if (
        not raw_label
        or raw_label == str(class_id)
        or raw_label.lower().startswith("class_")
    ) and 0 <= class_id < len(YOLO_CLASS_NAMES):
        return YOLO_CLASS_NAMES[class_id]
    return raw_label or f"class_{class_id}"


def catalog_key_for_label(label: str) -> str | None:
    lower_label = label.lower()
    for alias, key in CATALOG_LABEL_ALIASES.items():
        if alias.lower() in lower_label:
            return key
    for key, profile in DESMID_CATALOG.items():
        if key in lower_label:
            return key
        if str(profile["species"]).lower() in lower_label:
            return key
        latin_genus = str(profile["scientific_name"]).split(" ")[0].lower()
        if latin_genus and latin_genus in lower_label:
            return key
    return None


def profile_for_label(label: str) -> tuple[str, dict[str, Any]]:
    key = catalog_key_for_label(label)
    if key:
        return key, get_species_profile(key)
    return (
        "yolo",
        {
            "key": "yolo",
            "species": label,
            "scientific_name": label,
            "common_name": label,
            "category": "YOLO 检测类群",
            "confidence": 0,
            "description": "本地 YOLO 目标检测模型识别出的鼓藻类群。",
            "structure": "请结合检测框内细胞形态进行人工复核。",
            "habitat": "",
            "monitoring_value": "",
            "difficulty": "不同属间形态特征可能较细微，建议保留清晰显微原图用于复核。",
            "similar": [],
            "reference_key": "yolo",
            "color": "#22c55e",
            "traits": [],
        },
    )


def normalize_box(bbox: list[float], image_metrics: dict[str, Any]) -> dict[str, float]:
    width = max(float(image_metrics["width"]), 1)
    height = max(float(image_metrics["height"]), 1)
    x1, y1, x2, y2 = bbox
    return {
        "x": round(clamp(x1 / width), 5),
        "y": round(clamp(y1 / height), 5),
        "w": round(clamp((x2 - x1) / width), 5),
        "h": round(clamp((y2 - y1) / height), 5),
    }


def detection_alternatives(detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best_by_label: dict[str, dict[str, Any]] = {}
    grouped: dict[str, list[dict[str, Any]]] = {}
    for detection in detections:
        label = detection["label"]
        grouped.setdefault(label, []).append(detection)
        if label not in best_by_label or detection["confidence"] > best_by_label[label]["confidence"]:
            best_by_label[label] = detection

    alternatives = []
    for detection in sorted(best_by_label.values(), key=lambda item: item["confidence"], reverse=True):
        matched_key, profile = profile_for_label(detection["label"])
        label_items = grouped.get(detection["label"], [])
        avg_confidence = (
            sum(float(item.get("confidence") or 0) for item in label_items) / len(label_items)
            if label_items
            else float(detection["confidence"])
        )
        alternatives.append(
            {
                "key": matched_key,
                "species": detection["label"],
                "scientific_name": profile.get("scientific_name") or detection["label"],
                "confidence": detection["confidence"],
                "avg_confidence": round(avg_confidence, 4),
                "count": len(label_items),
                "color": profile.get("color") or "#22c55e",
                "source": "YOLO",
                "reason": "YOLO 检测模型在图像中定位到该类群目标。",
            }
        )
    return alternatives


def normalize_confidence_score(value: Any) -> float:
    if value is None:
        return 0
    try:
        if isinstance(value, str):
            value = value.strip().replace("%", "")
        score = float(value)
    except (TypeError, ValueError):
        return 0
    if score > 1:
        score = score / 100
    return round(clamp(score), 4)


def candidate_merge_key(item: dict[str, Any]) -> str:
    raw_key = str(item.get("key") or "").strip().lower()
    if raw_key and raw_key not in {"yolo", "none"}:
        return raw_key
    species = str(item.get("species") or item.get("label") or "").strip()
    return (catalog_key_for_label(species) or species).strip().lower()


def image_data_url(image_path: Path) -> str:
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }.get(image_path.suffix.lower(), "image/png")
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def ai_recognition_api_key() -> str:
    return (
        os.environ.get("AI_RECOGNITION_API_KEY", "").strip()
        or os.environ.get("DEEPSEEK_API_KEY", "").strip()
    )


def ai_recognition_source_label() -> str:
    explicit = os.environ.get("AI_RECOGNITION_SOURCE_LABEL", "").strip()
    if explicit:
        return explicit
    return "AI 视觉大模型" if AI_RECOGNITION_WITH_IMAGE else "AI 大模型复核"


def normalize_ai_candidate(raw: dict[str, Any]) -> dict[str, Any] | None:
    species = ai_text(raw.get("species") or raw.get("label") or raw.get("category") or raw.get("name"))
    if not species:
        return None
    matched_key, profile = profile_for_label(species)
    confidence = normalize_confidence_score(raw.get("confidence") or raw.get("score") or raw.get("probability"))
    return {
        "key": ai_text(raw.get("key")) or matched_key,
        "species": species,
        "scientific_name": ai_text(raw.get("scientific_name") or raw.get("latin")) or profile.get("scientific_name") or species,
        "confidence": confidence,
        "color": profile.get("color") or "#38bdf8",
        "source": ai_recognition_source_label(),
        "reason": ai_text(raw.get("reason") or raw.get("basis")) or "大模型结合候选类别和图像质量进行复核。",
    }


def post_ai_chat_completion(
    api_url: str,
    api_key: str,
    payload: dict[str, Any],
    timeout_seconds: float,
    failure_prefix: str,
    max_retries: int = 2,
) -> dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        req = urlrequest.Request(
            api_url,
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Connection": "close",
            },
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=timeout_seconds) as response:
                body = response.read().decode("utf-8")
            return json.loads(body)
        except http.client.IncompleteRead as exc:
            last_error = exc
            if attempt < max_retries:
                time.sleep(0.45 * (attempt + 1))
                continue
        except urlerror.HTTPError as exc:
            raise RuntimeError(f"{failure_prefix}：HTTP {exc.code}") from exc
        except Exception as exc:
            last_error = exc
            if attempt < max_retries and exc.__class__.__name__ in {"RemoteDisconnected", "ConnectionResetError", "TimeoutError"}:
                time.sleep(0.45 * (attempt + 1))
                continue
            raise RuntimeError(f"{failure_prefix}：{exc.__class__.__name__}") from exc
    raise RuntimeError(f"{failure_prefix}：连接中断，已自动重试 {max_retries} 次") from last_error


def chat_completion_content(response_payload: dict[str, Any]) -> str:
    return str(response_payload["choices"][0]["message"]["content"])


def parse_json_content(content: str) -> dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        return json.loads(content[start : end + 1]) if start >= 0 and end > start else {}


def merge_candidate_rankings(
    yolo_candidates: list[dict[str, Any]],
    ai_candidates: list[dict[str, Any]],
    allow_ai_only: bool = False,
) -> list[dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for item in yolo_candidates:
        key = candidate_merge_key(item)
        if not key:
            continue
        by_key[key] = {**item, "source": item.get("source") or "YOLO"}

    for item in ai_candidates:
        key = candidate_merge_key(item)
        if not key:
            continue
        if key in by_key:
            current = by_key[key]
            yolo_confidence = normalize_confidence_score(current.get("confidence"))
            ai_confidence = normalize_confidence_score(item.get("confidence"))
            current["confidence"] = round(max(yolo_confidence, yolo_confidence * 0.78 + ai_confidence * 0.22), 4)
            current["source"] = "YOLO + AI"
            current["reason"] = f"{current.get('reason', '')} 大模型复核：{item.get('reason', '')}".strip()
            current["ai_confidence"] = ai_confidence
        elif allow_ai_only:
            by_key[key] = {
                **item,
                "confidence": round(normalize_confidence_score(item.get("confidence")) * 0.72, 4),
                "source": item.get("source") or ai_recognition_source_label(),
            }

    return sorted(by_key.values(), key=lambda item: float(item.get("confidence") or 0), reverse=True)


def normalize_ai_recognition(raw: dict[str, Any], image_used: bool) -> dict[str, Any]:
    candidates_raw = raw.get("candidates") or raw.get("species_ranking") or raw.get("ranking") or []
    candidates = []
    if isinstance(candidates_raw, list):
        for candidate in candidates_raw:
            if isinstance(candidate, dict):
                normalized = normalize_ai_candidate(candidate)
                if normalized:
                    candidates.append(normalized)
    candidates.sort(key=lambda item: item["confidence"], reverse=True)
    fields = ["summary", "shape", "symmetry", "isthmus", "edge", "similar", "basis", "reviewSuggestion"]
    normalized = {
        "attempted": True,
        "enabled": True,
        "source": "ai",
        "sourceLabel": ai_recognition_source_label(),
        "model": AI_RECOGNITION_MODEL,
        "image_used": image_used,
        "candidates": candidates,
    }
    for field in fields:
        normalized[field] = ai_text(raw.get(field))
    return normalized


def call_ai_recognition(
    prediction: dict[str, Any],
    image_path: Path,
    image_metrics: dict[str, Any],
    yolo_candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    api_key = ai_recognition_api_key()
    if not api_key:
        raise RuntimeError("AI_RECOGNITION_API_KEY 或 DEEPSEEK_API_KEY 未配置")

    image_used = bool(AI_RECOGNITION_WITH_IMAGE)
    context = {
        "task": "鼓藻显微图识别候选复核与排序",
        "detected_species": prediction.get("species"),
        "confidence": prediction.get("confidence"),
        "cell_count": prediction.get("cell_count"),
        "yolo_candidates": yolo_candidates[:12],
        "image_quality": {
            "quality_score": image_metrics.get("quality_score"),
            "quality_level": image_metrics.get("quality_level"),
            "edge_score": image_metrics.get("edge_score"),
            "width": image_metrics.get("width"),
            "height": image_metrics.get("height"),
        },
        "allowed_genera": [
            {
                "chinese_name": item["chinese_name"],
                "scientific_genus": item.get("scientific_genus") or "",
            }
            for item in DESMID_GENERA
        ],
    }
    prompt = (
        "请结合本地 YOLO 检测候选、图像质量指标"
        + ("和随附显微图像" if image_used else "")
        + "，输出鼓藻候选种类排序。候选种类优先从 yolo_candidates 或 allowed_genera 中选择；"
        "无法判断时 candidates 返回空数组，不要编造不存在的类群。"
        "只输出 JSON，字段包含 candidates、summary、shape、symmetry、isthmus、edge、similar、basis、reviewSuggestion。"
        "candidates 每项包含 species、scientific_name、confidence、reason，并按 confidence 从高到低排列。"
        "confidence 使用 0-1 小数。输入数据："
        + json.dumps(context, ensure_ascii=False)
    )
    user_content: str | list[dict[str, Any]]
    if image_used:
        user_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": image_data_url(image_path), "detail": "low"}},
        ]
    else:
        user_content = prompt

    payload = {
        "model": AI_RECOGNITION_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是严谨的鼓藻显微图像识别辅助模型。你可以复核和重排候选类别，"
                    "但必须保留不确定性，不能替代人工鉴定。只输出 JSON。"
                ),
            },
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,
        "max_tokens": 900,
        "response_format": {"type": "json_object"},
    }
    response_payload = post_ai_chat_completion(
        AI_RECOGNITION_API_URL,
        api_key,
        payload,
        AI_RECOGNITION_TIMEOUT_SECONDS,
        "AI 大模型识别请求失败",
    )
    ai_payload = parse_json_content(chat_completion_content(response_payload))
    return normalize_ai_recognition(ai_payload, image_used)


def enrich_prediction_with_ai_recognition(
    prediction: dict[str, Any],
    image_path: Path,
    image_metrics: dict[str, Any],
) -> dict[str, Any]:
    yolo_candidates = detection_alternatives(prediction.get("detections") or [])
    ai_recognition: dict[str, Any] = {
        "attempted": False,
        "enabled": False,
        "source": "local",
        "sourceLabel": "YOLO 候选排序",
        "model": None,
        "image_used": False,
        "candidates": [],
    }
    if ai_recognition_api_key():
        try:
            ai_recognition = call_ai_recognition(prediction, image_path, image_metrics, yolo_candidates)
        except Exception as exc:
            ai_recognition = {
                **ai_recognition,
                "attempted": True,
                "sourceLabel": ai_recognition_source_label(),
                "model": AI_RECOGNITION_MODEL,
                "error": str(exc),
            }
    else:
        ai_recognition["error"] = "AI_RECOGNITION_API_KEY 或 DEEPSEEK_API_KEY 未配置"

    ranking = merge_candidate_rankings(
        yolo_candidates,
        ai_recognition.get("candidates") or [],
        allow_ai_only=bool(ai_recognition.get("image_used")),
    )
    prediction = {
        **prediction,
        "alternatives": ranking,
        "species_ranking": ranking,
        "ai_recognition": ai_recognition,
    }
    if ranking:
        best = ranking[0]
        matched_key, profile = profile_for_label(str(best.get("species") or ""))
        confidence = normalize_confidence_score(best.get("confidence"))
        prediction.update(
            {
                **profile,
                "key": best.get("key") or matched_key,
                "species": best.get("species") or prediction.get("species"),
                "scientific_name": best.get("scientific_name") or profile.get("scientific_name") or prediction.get("scientific_name"),
                "confidence": confidence,
                "confidence_level": confidence_level(confidence),
                "similarity": round(clamp(confidence - 0.03, 0.58, 0.98), 3),
                "analysis": build_analysis(confidence, image_metrics),
                "inference_mode": "yolo+ai" if ai_recognition.get("attempted") else "yolo",
            }
        )
    return prediction


def load_label_font(size: int = 18) -> ImageFont.ImageFont:
    for font_path in [
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path(r"C:\Windows\Fonts\simhei.ttf"),
        Path(r"C:\Windows\Fonts\simsun.ttc"),
    ]:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def draw_result_image(image_path: Path, detections: list[dict[str, Any]], result_filename: str) -> Path:
    result_path = RESULT_DIR / result_filename
    with Image.open(image_path) as image:
        canvas = ImageOps.exif_transpose(image).convert("RGB")
        draw = ImageDraw.Draw(canvas)
        font = load_label_font(max(16, min(canvas.size) // 32))

        for detection in detections:
            x1, y1, x2, y2 = detection["bbox"]
            label = f"{detection['label']} {detection['confidence']:.2f}"
            color = "#22c55e"
            draw.rectangle((x1, y1, x2, y2), outline=color, width=max(2, min(canvas.size) // 220))

            text_bbox = draw.textbbox((0, 0), label, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]
            label_y = max(0, y1 - text_height - 8)
            draw.rectangle((x1, label_y, x1 + text_width + 12, label_y + text_height + 8), fill=color)
            draw.text((x1 + 6, label_y + 4), label, fill="#052e16", font=font)

        canvas.save(result_path, format="JPEG", quality=92)
    return result_path


def build_candidate_reason(key: str) -> str:
    reasons = {
        "cosmarium": "双半细胞结构、中央缢缩和左右对称特征最接近典型鼓藻。",
        "closterium": "同属常见淡水鼓藻类，但图像未呈现明显弯月形长细胞。",
        "micrasterias": "存在对称结构相似点，但未观察到复杂放射状裂片。",
        "filamentous": "背景中可能存在丝状干扰物，但主体不像丝状藻类。",
    }
    return reasons.get(key, "作为形态相近的淡水藻类候选保留。")


def build_distribution(primary_key: str, top_confidence: float) -> list[dict[str, Any]]:
    remaining_keys = [key for key in DESMID_CATALOG if key != primary_key]
    weights = [0.5, 0.32, 0.18]
    candidates = [(primary_key, top_confidence)]
    remaining = max(0.0, 1 - top_confidence)
    candidates.extend((key, remaining * weights[index]) for index, key in enumerate(remaining_keys[:3]))

    return [
        {
            "key": key,
            "species": DESMID_CATALOG[key]["species"],
            "scientific_name": DESMID_CATALOG[key]["scientific_name"],
            "confidence": round(confidence, 4),
            "color": DESMID_CATALOG[key]["color"],
            "reason": build_candidate_reason(key),
        }
        for key, confidence in candidates
    ]


def build_analysis(confidence: float, image_metrics: dict[str, Any]) -> dict[str, Any]:
    quality = image_metrics["quality_score"] / 100
    edge_score = image_metrics["edge_score"]
    morphology_score = round(clamp(confidence * 0.68 + edge_score * 0.32), 3)
    reliability_score = round(clamp(confidence * 0.52 + quality * 0.3 + morphology_score * 0.18), 3)

    return {
        "summary": "系统综合本地 YOLO 推理置信度、图像质量和边缘清晰度生成结构化识别报告。",
        "scores": [
            {"label": "检测可靠性", "score": morphology_score, "value": f"{round(morphology_score * 100)}%"},
            {"label": "图像质量", "score": round(quality, 3), "value": f"{image_metrics['quality_score']} 分"},
            {"label": "边缘清晰", "score": edge_score, "value": f"{round(edge_score * 100)}%"},
            {"label": "综合可靠性", "score": reliability_score, "value": f"{round(reliability_score * 100)}%"},
        ],
        "explainability": [
            "结果来自本地 YOLO detect 模型推理。",
            "检测框、类别和置信度均来自模型输出。",
            "无目标时返回空 detections，不填充替代结果。",
        ],
    }


def ai_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "、".join(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    return str(value).strip()


def local_ai_analysis(prediction: dict[str, Any], image_metrics: dict[str, Any]) -> dict[str, Any]:
    detections = prediction.get("detections") or []
    confidence = float(prediction.get("confidence") or 0)
    profile_traits = prediction.get("traits") or []
    similar = prediction.get("similar") or []
    source_label = "本地规则分析"

    if not detections:
        return {
            "enabled": False,
            "source": "local",
            "sourceLabel": source_label,
            "model": None,
            "summary": "本地模型未返回有效检测框，AI 分析保留为复核建议。建议更换更清晰、主体完整的显微图像后重试。",
            "shape": "当前图片没有达到置信度阈值的鼓藻检测目标。",
            "symmetry": "无法从空检测结果中判断对称性。",
            "isthmus": "未检测到可分析的细胞缢缝区域。",
            "edge": "建议提高对焦、减少杂质遮挡并保持目标位于画面中央。",
            "similar": "未启用相似物种推断",
            "basis": "YOLO 模型未返回目标框，系统未补充虚构物种结论。",
            "reviewSuggestion": "建议人工复核",
        }

    quality = image_metrics.get("quality_score", 0)
    quality_hint = "图像清晰度较好" if quality >= 72 else "图像质量仍需人工复核"
    trait_text = "、".join(profile_traits[:4]) if profile_traits else "依据检测框内轮廓、对称性和边缘清晰度判断"
    similar_text = "、".join(similar[:4]) if similar else "未启用相似种推断"
    review = "可抽样人工复核" if confidence >= 0.8 and quality >= 72 else "建议人工复核"
    return {
        "enabled": False,
        "source": "local",
        "sourceLabel": source_label,
        "model": None,
        "summary": f"本地规则根据 YOLO 检测类别、置信度和图像质量生成辅助分析；{quality_hint}。",
        "shape": prediction.get("description") or trait_text,
        "symmetry": "沿主要轴线呈稳定对称趋势，仍需结合完整细胞轮廓确认。",
        "isthmus": prediction.get("structure") or "请结合检测框内细胞形态人工复核细胞缢缝。",
        "edge": f"边缘清晰度约 {round(float(image_metrics.get('edge_score', 0)) * 100)}%，{quality_hint}。",
        "similar": similar_text,
        "basis": f"依据 YOLO 检测标签“{prediction.get('species', 'Unknown')}”、置信度 {round(confidence * 100, 1)}% 和图像质量指标。",
        "reviewSuggestion": review,
    }


def normalize_ai_analysis(
    raw: dict[str, Any],
    fallback: dict[str, Any],
    source: str = "deepseek",
    source_label: str = "DeepSeek AI",
    model: str = DEEPSEEK_MODEL,
) -> dict[str, Any]:
    fields = ["summary", "shape", "symmetry", "isthmus", "edge", "similar", "basis", "reviewSuggestion"]
    normalized = {
        "enabled": True,
        "source": source,
        "sourceLabel": source_label,
        "model": model,
    }
    for field in fields:
        normalized[field] = ai_text(raw.get(field)) or fallback.get(field, "")
    if raw.get("error"):
        normalized["error_detail"] = ai_text(raw.get("error"))
        normalized["error"] = "AI 复核暂不可用，已使用本地 YOLO 结果和规则分析；不影响本次识别、排序和报告导出。"
    return normalized


def call_deepseek_ai_analysis(prediction: dict[str, Any], image_metrics: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY 未配置")

    fallback = local_ai_analysis(prediction, image_metrics)
    context = {
        "detected_species": prediction.get("species"),
        "scientific_name": prediction.get("scientific_name"),
        "confidence": prediction.get("confidence"),
        "cell_count": prediction.get("cell_count"),
        "detections": [
            {
                "label": item.get("label"),
                "confidence": item.get("confidence"),
                "bbox": item.get("bbox"),
            }
            for item in (prediction.get("detections") or [])[:8]
        ],
        "image_quality": {
            "quality_score": image_metrics.get("quality_score"),
            "quality_level": image_metrics.get("quality_level"),
            "edge_score": image_metrics.get("edge_score"),
            "width": image_metrics.get("width"),
            "height": image_metrics.get("height"),
        },
        "catalog_profile": {
            "description": prediction.get("description"),
            "structure": prediction.get("structure"),
            "difficulty": prediction.get("difficulty"),
            "traits": prediction.get("traits"),
            "similar": prediction.get("similar"),
        },
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是鼓藻显微图像识别的科研辅助分析员。只根据用户提供的 YOLO 检测结果、"
                    "图像质量指标和物种档案信息写中文分析；不要编造未观察到的细节，不要替代人工鉴定。"
                    "只输出 JSON。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请返回 JSON，字段必须包含 summary、shape、symmetry、isthmus、edge、similar、"
                    "basis、reviewSuggestion。每个字段用一句简洁中文。输入数据："
                    + json.dumps(context, ensure_ascii=False)
                ),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 720,
        "response_format": {"type": "json_object"},
    }
    response_payload = post_ai_chat_completion(
        f"{DEEPSEEK_API_BASE_URL}/chat/completions",
        api_key,
        payload,
        DEEPSEEK_TIMEOUT_SECONDS,
        "DeepSeek API 请求失败",
    )
    ai_payload = parse_json_content(chat_completion_content(response_payload))
    return normalize_ai_analysis(ai_payload, fallback)


def enrich_analysis_with_ai(prediction: dict[str, Any], image_metrics: dict[str, Any]) -> dict[str, Any]:
    analysis = dict(prediction.get("analysis") or build_analysis(float(prediction.get("confidence") or 0), image_metrics))
    fallback = local_ai_analysis(prediction, image_metrics)
    ai_analysis = fallback
    recognition_ai = prediction.get("ai_recognition") or {}
    if recognition_ai.get("attempted"):
        ai_analysis = normalize_ai_analysis(
            recognition_ai,
            fallback,
            source=str(recognition_ai.get("source") or "ai"),
            source_label=str(recognition_ai.get("sourceLabel") or ai_recognition_source_label()),
            model=str(recognition_ai.get("model") or AI_RECOGNITION_MODEL),
        )
        ai_analysis["enabled"] = bool(recognition_ai.get("enabled"))
        ai_analysis["image_used"] = bool(recognition_ai.get("image_used"))
    elif os.environ.get("DEEPSEEK_API_KEY", "").strip():
        try:
            ai_analysis = call_deepseek_ai_analysis(prediction, image_metrics)
        except Exception as exc:
            ai_analysis = {**fallback, "error": str(exc)}
    else:
        ai_analysis = {**fallback, "error": "AI_RECOGNITION_API_KEY 或 DEEPSEEK_API_KEY 未配置"}

    analysis["ai"] = ai_analysis
    analysis["morphology"] = ai_analysis.get("shape", "")
    analysis["summary"] = ai_analysis.get("summary") or analysis.get("summary", "")
    analysis["explainability"] = [
        *analysis.get("explainability", []),
        f"AI 分析来源：{ai_analysis.get('sourceLabel', '本地规则分析')}。",
    ]
    return analysis


def run_yolo_prediction(image_path: Path, image_metrics: dict[str, Any], conf: float = DEFAULT_CONFIDENCE) -> dict[str, Any]:
    model = get_yolo_model(strict=True)
    started_at = time.perf_counter()
    results = model.predict(source=str(image_path), conf=conf, device=_yolo_device, verbose=False)
    elapsed = f"{time.perf_counter() - started_at:.2f}s"

    result = results[0] if results else None
    names = getattr(result, "names", {}) or {}
    detections: list[dict[str, Any]] = []
    result_boxes = getattr(result, "boxes", None)

    if result_boxes is not None:
        for box in result_boxes:
            class_id = int(box.cls.detach().cpu().item())
            confidence = round(float(box.conf.detach().cpu().item()), 4)
            bbox = [round(float(value), 2) for value in box.xyxy[0].detach().cpu().tolist()]
            label = class_label(class_id, names)
            detections.append(
                {
                    "class_id": class_id,
                    "label": label,
                    "confidence": confidence,
                    "bbox": bbox,
                    **normalize_box(bbox, image_metrics),
                }
            )

    detections.sort(key=lambda item: item["confidence"], reverse=True)
    if not detections:
        prediction = {
            "key": "none",
            "species": "未检测到鼓藻目标",
            "scientific_name": "Unknown",
            "confidence": 0,
            "confidence_level": "无目标",
            "similarity": 0,
            "detections": [],
            "boxes": [],
            "alternatives": [],
            "analysis": build_analysis(0, image_metrics),
            "heatmap": [],
            "cell_count": 0,
            "processing_time": elapsed,
            "inference_mode": "yolo",
            "message": "未检测到鼓藻目标",
        }
        return enrich_prediction_with_ai_recognition(prediction, image_path, image_metrics)

    best_detection = detections[0]
    matched_key, profile = profile_for_label(best_detection["label"])
    confidence = float(best_detection["confidence"])

    prediction = {
        **profile,
        "key": matched_key,
        "species": best_detection["label"],
        "scientific_name": profile.get("scientific_name") or best_detection["label"],
        "confidence": confidence,
        "confidence_level": confidence_level(confidence),
        "similarity": round(clamp(confidence - 0.03, 0.58, 0.98), 3),
        "detections": detections,
        "boxes": detections,
        "alternatives": detection_alternatives(detections),
        "analysis": build_analysis(confidence, image_metrics),
        "heatmap": [],
        "cell_count": len(detections),
        "processing_time": elapsed,
        "inference_mode": "yolo",
    }
    return enrich_prediction_with_ai_recognition(prediction, image_path, image_metrics)


def build_response(
    prediction: dict[str, Any],
    saved_filename: str,
    result_filename: str,
    image_metrics: dict[str, Any],
    user: dict[str, Any],
    conf: float = DEFAULT_CONFIDENCE,
) -> dict[str, Any]:
    original_image_url = f"{request.host_url.rstrip('/')}/uploads/{saved_filename}"
    result_image_url = f"{request.host_url.rstrip('/')}/uploads/results/{result_filename}"
    result_id = f"DESMID-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    analysis = enrich_analysis_with_ai(prediction, image_metrics)
    prediction = {**prediction, "analysis": analysis}
    ai_source = analysis.get("ai", {}).get("sourceLabel", "本地规则分析")
    ranking = prediction.get("species_ranking") or prediction.get("alternatives") or []
    ranking_text = "；".join(
        f"{index + 1}. {item.get('species', 'Unknown')} {round(float(item.get('confidence') or 0) * 100, 1)}%"
        for index, item in enumerate(ranking[:5])
    )
    structured_table = [
        {"field": "候选种类", "value": prediction["species"]},
        {"field": "拉丁参考名", "value": prediction["scientific_name"]},
        {"field": "置信度", "value": f"{round(prediction['confidence'] * 100, 1)}%"},
        {"field": "候选排序", "value": ranking_text or "无候选种类"},
        {"field": "图像质量", "value": f"{image_metrics['quality_score']} 分 / {image_metrics['quality_level']}"},
        {"field": "细胞数量", "value": str(prediction.get("cell_count", len(prediction.get("boxes", []))))},
        {"field": "推理模式", "value": f"YOLO 模型 + {ai_source}"},
    ]
    return {
        **prediction,
        "success": True,
        "result_id": result_id,
        "sample_record_id": result_id,
        "image_url": result_image_url,
        "result_image_url": result_image_url,
        "original_image_url": original_image_url,
        "conf_threshold": conf,
        "identify_time": now_text(),
        "processing_time": prediction.get("processing_time", "1.2s"),
        "user": public_user(user),
        "quality": image_metrics,
        "structured_table": structured_table,
        "model_available": MODEL_PATH.exists(),
        "model_path": str(MODEL_PATH),
        "model_device": _yolo_device,
        "model_load_error": _yolo_load_error,
        "file": {
            "name": saved_filename,
            "url": original_image_url,
            "result_name": result_filename,
            "result_url": result_image_url,
            "width": image_metrics["width"],
            "height": image_metrics["height"],
            "megapixels": image_metrics["megapixels"],
        },
    }


def save_record(report: dict[str, Any], user: dict[str, Any]) -> None:
    sample_info = report.get("sample_info") or {}
    profile = get_species_profile(str(report.get("key") or "cosmarium"))
    morphology_payload = {
        "cell_shape": profile.get("description") or report.get("description", ""),
        "symmetry": "依据细胞整体轮廓、中央缢缩或端部形态进行辅助判读。",
        "isthmus": profile.get("structure", ""),
        "edge_feature": profile.get("difficulty", ""),
        "similar_species": profile.get("similar", []),
        "basis": report.get("analysis", {}),
        "review_suggestion": "建议人工复核" if float(report["confidence"]) < 0.8 else "可抽样人工复核",
    }
    with db() as conn:
        conn.execute(
            """
            INSERT INTO records (
                id, user_id, species, scientific_name, confidence, image_filename,
                image_url, quality_score, inference_mode, report_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report["result_id"],
                user["id"],
                report["species"],
                report["scientific_name"],
                float(report["confidence"]),
                report["file"]["name"],
                report["image_url"],
                float(report["quality"]["quality_score"]),
                report["inference_mode"],
                json.dumps(report, ensure_ascii=False),
                report["identify_time"],
            ),
        )
        conn.execute(
            """
            INSERT OR REPLACE INTO sample_records (
                id, sample_code, user_id, image_name, image_url, sampling_site_id,
                sampling_location, water_type, microscope_magnification, staining_method,
                capture_device, species, scientific_name, confidence, top_candidates_json,
                morphology_json, processing_time, review_status, in_training_set,
                source_report_id, remark, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report["sample_record_id"],
                sample_info.get("sampleId") or report["sample_record_id"],
                user["id"],
                report["file"]["name"],
                report["image_url"],
                sample_info.get("samplingSiteId"),
                sample_info.get("location") or "未填写采样地点",
                sample_info.get("waterType") or "未填写",
                sample_info.get("magnification") or "未填写",
                sample_info.get("staining") or "未填写",
                sample_info.get("device") or "未填写",
                report["species"],
                report["scientific_name"],
                float(report["confidence"]),
                json.dumps(report.get("alternatives", []), ensure_ascii=False),
                json.dumps(morphology_payload, ensure_ascii=False),
                report.get("processing_time", "1.2s"),
                "待复核" if float(report["confidence"]) < 0.8 else "未复核",
                0,
                report["result_id"],
                sample_info.get("remark") or "",
                report["identify_time"],
                report["identify_time"],
            ),
        )


def record_for_user(result_id: str, user: dict[str, Any]) -> dict[str, Any] | None:
    with db() as conn:
        row = conn.execute(
            "SELECT report_json FROM records WHERE id = ? AND user_id = ?",
            (result_id, user["id"]),
        ).fetchone()
    if not row:
        return None
    return json.loads(row["report_json"])


def history_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT report_json FROM records
            WHERE user_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 50
            """,
            (user["id"],),
        ).fetchall()
    return [json.loads(row["report_json"]) for row in rows]


def feedback_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM feedback WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 100",
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


def desmid_image_root() -> Path | None:
    env_root = os.environ.get("DESMID_IMAGE_ROOT")
    candidates = [
        Path(env_root) if env_root else None,
        BASE_DIR.parent / "鼓藻",
        BASE_DIR.parent.parent / "鼓藻(1)" / "鼓藻",
        BASE_DIR.parent.parent / "鼓藻" / "鼓藻",
    ]
    for candidate in candidates:
        if candidate and candidate.exists() and candidate.is_dir():
            return candidate
    return None


def folder_matches_genus(folder: Path, item: dict[str, Any]) -> bool:
    folder_name = folder.name.lower()
    ascii_name = "".join(char for char in folder_name if char.isascii()).replace("-", "")
    scientific = str(item.get("scientific_genus") or "").lower().replace("-", "")
    chinese = str(item.get("chinese_name") or "")
    item_id = str(item.get("id") or "").lower().replace("-", "")
    if scientific and ascii_name.startswith(scientific):
        return True
    if item_id and ascii_name.startswith(item_id):
        return True
    if not scientific and chinese:
        return folder.name == chinese or folder.name.endswith(chinese)
    return False


def score_archive_image(path: Path, width: int, height: int, size: int) -> float:
    pixels = width * height
    score = min(pixels, 2_500_000) + min(size, 2_500_000) * 0.2
    name = path.name.lower()
    if "屏幕截图" in path.name or "screenshot" in name:
        score += 450_000
    if min(width, height) >= 220:
        score += 160_000
    if max(width, height) < 120:
        score -= 180_000
    return score


def archive_image_meta(path: Path) -> dict[str, Any] | None:
    try:
        with Image.open(path) as image:
            width, height = image.size
    except Exception:
        return None
    stat = path.stat()
    image_id = hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()[:16]
    return {
        "id": image_id,
        "url": f"/api/desmid-images/{image_id}",
        "filename": path.name,
        "name": path.stem,
        "width": width,
        "height": height,
        "size": stat.st_size,
        "score": score_archive_image(path, width, height, stat.st_size),
        "_path": path,
    }


def build_desmid_image_index() -> dict[str, Any]:
    root = desmid_image_root()
    if root is None:
        return {"root": None, "by_genus": {}, "total": 0}

    folders = [path for path in root.rglob("*") if path.is_dir()]
    by_genus: dict[str, dict[str, Any]] = {}
    lookup: dict[str, Path] = {}
    total = 0

    for item in DESMID_GENERA:
        folder = next((candidate for candidate in folders if folder_matches_genus(candidate, item)), None)
        if folder is None:
            by_genus[item["id"]] = {"count": 0, "folder_name": "", "images": []}
            continue

        images = []
        for path in folder.iterdir():
            if not path.is_file() or path.suffix.lower() not in DESMID_IMAGE_EXTENSIONS:
                continue
            meta = archive_image_meta(path)
            if meta:
                images.append(meta)

        images.sort(key=lambda meta: meta["score"], reverse=True)
        total += len(images)
        selected = []
        for meta in images[:8]:
            lookup[meta["id"]] = meta["_path"]
            selected.append({key: value for key, value in meta.items() if key != "_path"})

        by_genus[item["id"]] = {
            "count": len(images),
            "folder_name": folder.name,
            "images": selected,
        }

    _desmid_image_lookup.clear()
    _desmid_image_lookup.update(lookup)
    return {"root": str(root), "by_genus": by_genus, "total": total}


def desmid_image_index() -> dict[str, Any]:
    global _desmid_image_cache
    if _desmid_image_cache is None:
        _desmid_image_cache = build_desmid_image_index()
    return _desmid_image_cache


def attach_archive_images(item: dict[str, Any]) -> dict[str, Any]:
    image_info = desmid_image_index()["by_genus"].get(item["id"], {"count": 0, "folder_name": "", "images": []})
    images = image_info.get("images", [])
    item["image_count"] = image_info.get("count", 0)
    item["image_source_folder"] = image_info.get("folder_name", "")
    item["images"] = images
    item["representative_image"] = images[0] if images else None
    return item


def desmid_genera_items(conn: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    close_conn = conn is None
    conn = conn or db()
    try:
        rows = conn.execute(
            """
            SELECT
                g.*,
                COUNT(d.id) AS distribution_count,
                SUM(CASE WHEN d.source IN ('GBIF', 'iNaturalist') THEN 1 ELSE 0 END) AS public_count,
                SUM(CASE WHEN d.source IN ('LocalSampling', '人工导入') THEN 1 ELSE 0 END) AS local_count
            FROM desmid_genera g
            LEFT JOIN distribution_records d
              ON d.genus = g.scientific_genus
              OR d.speciesName = g.chinese_name
              OR d.scientificName LIKE g.scientific_genus || ' %'
            GROUP BY g.id
            ORDER BY g.scientific_genus = '', g.scientific_genus, g.chinese_name
            """
        ).fetchall()
        return [attach_archive_images(dict(row)) for row in rows]
    finally:
        if close_conn:
            conn.close()


def build_dashboard() -> dict[str, Any]:
    with db() as conn:
        genera = desmid_genera_items(conn)
        record_count = conn.execute("SELECT COUNT(*) AS count FROM records").fetchone()["count"]
        detection_count = conn.execute(
            "SELECT COALESCE(SUM(json_array_length(json_extract(report_json, '$.detections'))), 0) AS count FROM records"
        ).fetchone()["count"]
        distribution_count = conn.execute("SELECT COUNT(*) AS count FROM distribution_records").fetchone()["count"]
        public_distribution_count = conn.execute(
            "SELECT COUNT(*) AS count FROM distribution_records WHERE source IN ('GBIF', 'iNaturalist')"
        ).fetchone()["count"]
        local_distribution_count = conn.execute(
            "SELECT COUNT(*) AS count FROM distribution_records WHERE source IN ('LocalSampling', '人工导入')"
        ).fetchone()["count"]
        region_count = conn.execute(
            "SELECT COUNT(DISTINCT region) AS count FROM distribution_records WHERE COALESCE(region, '') <> ''"
        ).fetchone()["count"]
        report_count = conn.execute("SELECT COUNT(*) AS count FROM records WHERE report_json IS NOT NULL").fetchone()["count"]
        latest_distribution = conn.execute(
            "SELECT MAX(syncedAt) AS latest FROM distribution_records"
        ).fetchone()["latest"]
        recent_rows = conn.execute(
            """
            SELECT id, species, scientific_name, confidence, image_url, inference_mode, created_at
            FROM records
            ORDER BY datetime(created_at) DESC
            LIMIT 5
            """
        ).fetchall()

    return {
        "metrics": [
            {"label": "识别记录数", "value": record_count, "hint": "来自本地数据库 records 表"},
            {"label": "检测目标数", "value": detection_count, "hint": "来自 YOLO 返回 detections"},
            {"label": "已收录鼓藻属", "value": len(genera), "hint": "来自用户提供属名录入库"},
            {"label": "真实分布记录", "value": distribution_count, "hint": "仅统计 GBIF / iNaturalist / 明确坐标记录"},
            {"label": "覆盖区域数", "value": region_count, "hint": "按真实分布记录 region 字段统计"},
            {"label": "报告记录数", "value": report_count, "hint": "来自真实识别记录"},
        ],
        "distribution": {
            "total": distribution_count,
            "public": public_distribution_count,
            "local": local_distribution_count,
            "updated_at": latest_distribution or "暂无真实分布数据",
        },
        "genera": genera,
        "recent_records": [dict(row) for row in recent_rows],
    }


def build_user_stats(user: dict[str, Any]) -> dict[str, Any]:
    history_items = history_for_user(user)
    feedback_items = feedback_for_user(user)
    total = len(history_items)
    average_confidence = round(sum(item["confidence"] for item in history_items) / total, 4) if total else 0
    average_quality = round(sum(item["quality"]["quality_score"] for item in history_items) / total, 1) if total else 0

    species_counts: dict[str, int] = {}
    confidence_buckets = {"90%-100%": 0, "75%-89%": 0, "60%-74%": 0, "低于60%": 0}
    quality_buckets = {"优秀": 0, "良好": 0, "可用": 0, "需重拍": 0}
    weekly_counts: dict[str, int] = {}

    today = datetime.now().date()
    for index in range(5, -1, -1):
        start = today - timedelta(days=today.weekday() + index * 7)
        label = f"{start.strftime('%m/%d')}周"
        weekly_counts[label] = 0

    for item in history_items:
        species_counts[item["species"]] = species_counts.get(item["species"], 0) + 1

        confidence = float(item["confidence"])
        if confidence >= 0.9:
            confidence_buckets["90%-100%"] += 1
        elif confidence >= 0.75:
            confidence_buckets["75%-89%"] += 1
        elif confidence >= 0.6:
            confidence_buckets["60%-74%"] += 1
        else:
            confidence_buckets["低于60%"] += 1

        quality_level = item["quality"].get("quality_level", "可用")
        quality_buckets[quality_level] = quality_buckets.get(quality_level, 0) + 1

        created = datetime.strptime(item["identify_time"], "%Y-%m-%d %H:%M:%S").date()
        week_start = created - timedelta(days=created.weekday())
        label = f"{week_start.strftime('%m/%d')}周"
        if label in weekly_counts:
            weekly_counts[label] += 1

    feedback_summary = {"correct": 0, "uncertain": 0, "wrong": 0}
    for item in feedback_items:
        feedback_summary[item["verdict"]] = feedback_summary.get(item["verdict"], 0) + 1

    checked = feedback_summary["correct"] + feedback_summary["wrong"]
    accuracy_rate = round(feedback_summary["correct"] / checked, 4) if checked else 0

    return {
        "user": public_user(user),
        "summary": {
            "identification_total": total,
            "feedback_total": len(feedback_items),
            "average_confidence": average_confidence,
            "average_quality": average_quality,
            "accuracy_rate": accuracy_rate,
            "model_available": MODEL_PATH.exists(),
            "latest_time": history_items[0]["identify_time"] if history_items else None,
        },
        "weekly_counts": [{"label": label, "value": value} for label, value in weekly_counts.items()],
        "species_counts": [
            {"label": label, "value": value}
            for label, value in sorted(species_counts.items(), key=lambda item: item[1], reverse=True)
        ],
        "quality_buckets": [{"label": label, "value": value} for label, value in quality_buckets.items()],
        "confidence_buckets": [{"label": label, "value": value} for label, value in confidence_buckets.items()],
        "feedback_summary": [{"label": label, "value": value} for label, value in feedback_summary.items()],
        "model": {
            "name": "Ultralytics YOLO detect 鼓藻识别模型",
            "version": MODEL_PATH.name,
            "status": "YOLO 已连接" if MODEL_PATH.exists() else "模型文件不存在",
            "updated_at": now_text(),
            "changelog": [
                "加载本地 best.pt 模型进行真实推理。",
                "检测结果写入 SQLite 历史记录。",
                "不再使用固定替代识别结果。",
            ],
        },
        "recent": history_items[:6],
    }


@app.post("/api/auth/register")
def register() -> Any:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()
    display_name = str(payload.get("display_name", "")).strip() or username
    remember = bool(payload.get("remember", True))

    validation_error = validate_auth_payload(username, password, display_name, registering=True)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    if find_user_by_username(username):
        return jsonify({"error": "该用户名已被注册。"}), 409

    user_id = uuid.uuid4().hex
    salt, password_hash = hash_password(password)
    token = secrets.token_urlsafe(32)
    created_at = now_text()
    token_expires_at = auth_expiry_text(remember)
    with db() as conn:
        conn.execute(
            """
            INSERT INTO users (
                id, username, display_name, salt, password_hash, token,
                token_expires_at, last_login_at, login_count, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, username, display_name, salt, password_hash, token, token_expires_at, created_at, 1, created_at),
        )

    user = {
        "id": user_id,
        "username": username,
        "display_name": display_name,
        "created_at": created_at,
        "last_login_at": created_at,
        "login_count": 1,
        "token_expires_at": token_expires_at,
    }
    return jsonify({"token": token, "user": user})


@app.post("/api/auth/login")
def login() -> Any:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()
    remember = bool(payload.get("remember", True))
    validation_error = validate_auth_payload(username, password)
    if validation_error:
        return jsonify({"error": validation_error}), 400
    user = find_user_by_username(username)
    if user is None:
        return jsonify({"error": "用户名或密码错误。"}), 401

    _, password_hash = hash_password(password, user["salt"])
    if not hmac.compare_digest(password_hash, user["password_hash"]):
        return jsonify({"error": "用户名或密码错误。"}), 401

    token = secrets.token_urlsafe(32)
    last_login_at = now_text()
    token_expires_at = auth_expiry_text(remember)
    with db() as conn:
        conn.execute(
            """
            UPDATE users
            SET token = ?, token_expires_at = ?, last_login_at = ?, login_count = COALESCE(login_count, 0) + 1
            WHERE id = ?
            """,
            (token, token_expires_at, last_login_at, user["id"]),
        )
    user["token"] = token
    user["token_expires_at"] = token_expires_at
    user["last_login_at"] = last_login_at
    user["login_count"] = int(user.get("login_count") or 0) + 1
    return jsonify({"token": token, "user": public_user(user)})


@app.post("/api/auth/logout")
def logout() -> Any:
    user = current_user()
    if user:
        with db() as conn:
            conn.execute("UPDATE users SET token = NULL, token_expires_at = NULL WHERE id = ?", (user["id"],))
    return jsonify({"ok": True})


@app.get("/api/auth/me")
def me() -> Any:
    user = current_user()
    if user is None:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": public_user(user)})


@app.get("/api/health")
def health() -> Any:
    model = get_yolo_model()
    return jsonify(
        {
            "status": "ok",
            "service": "guzaoshibie-backend",
            "database": str(DB_PATH),
            "model_path": str(MODEL_PATH),
            "model_available": MODEL_PATH.exists(),
            "model_loaded": model is not None,
            "model_device": _yolo_device,
            "model_load_error": _yolo_load_error,
            "upload_limit_mb": 12,
            "time": now_text(),
        }
    )


@app.get("/api/species")
def species() -> Any:
    return jsonify({"items": desmid_genera_items()})


@app.get("/api/desmid-genera")
def desmid_genera_api() -> Any:
    return jsonify({"items": desmid_genera_items()})


@app.get("/api/desmid-images/<image_id>")
def desmid_image_api(image_id: str) -> Any:
    desmid_image_index()
    image_path = _desmid_image_lookup.get(image_id)
    root = desmid_image_root()
    if image_path is None or root is None:
        return jsonify({"error": "未找到该鼓藻图库图片。"}), 404
    try:
        image_path.resolve().relative_to(root.resolve())
    except ValueError:
        return jsonify({"error": "图片路径不在鼓藻图库目录内。"}), 403
    return send_file(image_path, conditional=True)


@app.get("/api/dashboard")
def dashboard_api() -> Any:
    return jsonify(build_dashboard())


@app.get("/api/profile")
def profile_api() -> Any:
    user = current_user()
    if user is None:
        return jsonify({"authenticated": False, "user": None, "stats": None})
    return jsonify({"authenticated": True, **build_user_stats(user)})


@app.get("/api/references")
def references() -> Any:
    return jsonify(
        {
            "items": [
                {
                    "key": item["key"],
                    "species": item["species"],
                    "scientific_name": item["scientific_name"],
                    "traits": item["traits"],
                    "description": item["description"],
                }
                for item in catalog_as_list()
            ]
        }
    )


@app.get("/api/history")
def history() -> Any:
    user, error = require_user()
    if error:
        return error
    return jsonify({"items": history_for_user(user)})


@app.get("/api/history/<result_id>")
def history_detail(result_id: str) -> Any:
    user, error = require_user()
    if error:
        return error
    report = record_for_user(result_id, user)
    if report is None:
        return jsonify({"error": "未找到该识别报告。"}), 404
    return jsonify(report)


@app.get("/api/stats")
def stats() -> Any:
    user, error = require_user()
    if error:
        return error
    return jsonify(build_user_stats(user))


def safe_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def sample_record_from_row(row: sqlite3.Row) -> dict[str, Any]:
    item = row_dict(row)
    item["top_candidates"] = safe_json(item.pop("top_candidates_json", None), [])
    item["morphology"] = safe_json(item.pop("morphology_json", None), {})
    item["in_training_set"] = bool(item.get("in_training_set"))
    return item


def species_info_from_row(row: sqlite3.Row) -> dict[str, Any]:
    item = row_dict(row)
    item["similar_species"] = safe_json(item.pop("similar_species_json", None), [])
    return item


def model_version_from_row(row: sqlite3.Row) -> dict[str, Any]:
    item = row_dict(row)
    item["is_current"] = bool(item.get("is_current"))
    item["metrics"] = safe_json(item.pop("metrics_json", None), {})
    return item


def batch_task_from_row(row: sqlite3.Row) -> dict[str, Any]:
    item = row_dict(row)
    item["result"] = safe_json(item.pop("result_json", None), [])
    return item


def product_records() -> dict[str, Any]:
    with db() as conn:
        sample_rows = conn.execute("SELECT * FROM sample_records ORDER BY datetime(created_at) DESC LIMIT 100").fetchall()
        site_rows = conn.execute("SELECT * FROM sampling_sites ORDER BY datetime(updated_at) DESC").fetchall()
        species_rows = conn.execute("SELECT * FROM species_info ORDER BY training_samples DESC").fetchall()
        batch_rows = conn.execute("SELECT * FROM batch_tasks ORDER BY datetime(created_at) DESC LIMIT 30").fetchall()
        model_rows = conn.execute("SELECT * FROM model_versions ORDER BY is_current DESC, datetime(trained_at) DESC").fetchall()
        dataset_rows = conn.execute("SELECT * FROM training_datasets ORDER BY train_count DESC").fetchall()
        review_rows = conn.execute("SELECT * FROM review_records ORDER BY datetime(created_at) DESC LIMIT 100").fetchall()
        distribution_rows = conn.execute("SELECT * FROM distribution_records ORDER BY datetime(syncedAt) DESC LIMIT 500").fetchall()

    return {
        "sample_records": [sample_record_from_row(row) for row in sample_rows],
        "sampling_sites": [row_dict(row) for row in site_rows],
        "species_info": [species_info_from_row(row) for row in species_rows],
        "batch_tasks": [batch_task_from_row(row) for row in batch_rows],
        "model_versions": [model_version_from_row(row) for row in model_rows],
        "training_datasets": [row_dict(row) for row in dataset_rows],
        "review_records": [row_dict(row) for row in review_rows],
        "distribution_records": [row_dict(row) for row in distribution_rows],
    }


def create_sample_record(payload: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    sample_info = payload.get("sample_info") or payload.get("sampleInfo") or {}
    recognition = payload.get("recognition") or payload
    sample_id = str(recognition.get("sampleId") or sample_info.get("sampleId") or f"SMP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    confidence = float(recognition.get("confidence") or 0)
    timestamp = now_text()
    item = SampleRecord(
        id=sample_id,
        sample_code=str(sample_info.get("sampleId") or sample_id),
        image_name=str(recognition.get("imageName") or recognition.get("file", {}).get("name") or "manual-entry.jpg"),
        image_url=str(recognition.get("imageUrl") or recognition.get("image_url") or ""),
        sampling_location=str(sample_info.get("location") or "未填写采样地点"),
        water_type=str(sample_info.get("waterType") or "未填写"),
        microscope_magnification=str(sample_info.get("magnification") or "未填写"),
        staining_method=str(sample_info.get("staining") or "未填写"),
        capture_device=str(sample_info.get("device") or "未填写"),
        species=str(recognition.get("species") or "待确认"),
        scientific_name=str(recognition.get("latin") or recognition.get("scientific_name") or "Unknown"),
        confidence=confidence,
        top_candidates=list(recognition.get("candidates") or recognition.get("alternatives") or []),
        morphology=dict(recognition.get("morphology") or {}),
        processing_time=str(recognition.get("elapsed") or recognition.get("processing_time") or "未记录"),
        review_status="待复核" if confidence < 0.8 else "未复核",
        in_training_set=False,
        remark=str(sample_info.get("remark") or ""),
        created_at=timestamp,
    )
    with db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sample_records (
                id, sample_code, user_id, image_name, image_url, sampling_location,
                water_type, microscope_magnification, staining_method, capture_device,
                species, scientific_name, confidence, top_candidates_json, morphology_json,
                processing_time, review_status, in_training_set, source_report_id,
                remark, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.id,
                item.sample_code,
                (user or anonymous_user())["id"],
                item.image_name,
                item.image_url,
                item.sampling_location,
                item.water_type,
                item.microscope_magnification,
                item.staining_method,
                item.capture_device,
                item.species,
                item.scientific_name,
                item.confidence,
                json.dumps(item.top_candidates, ensure_ascii=False),
                json.dumps(item.morphology, ensure_ascii=False),
                item.processing_time,
                item.review_status,
                int(item.in_training_set),
                str(recognition.get("result_id") or item.id),
                item.remark,
                item.created_at,
                item.created_at,
            ),
        )
        coordinates = parse_sampling_coordinates(sample_info)
        if payload.get("sync_distribution") and coordinates:
            latitude, longitude = coordinates
            cacheDistributionRecords(
                conn,
                [
                    {
                        "id": f"dist-{item.id}",
                        "source": "LocalSampling",
                        "sourceRecordId": item.id,
                        "speciesName": item.species,
                        "scientificName": item.scientific_name,
                        "genus": item.scientific_name.split(" ")[0] if item.scientific_name else item.species,
                        "taxonKey": f"LOCAL-{item.id}",
                        "latitude": latitude,
                        "longitude": longitude,
                        "country": "China",
                        "region": sample_info.get("region") or "本地采样",
                        "locality": item.sampling_location,
                        "eventDate": item.created_at[:10],
                        "waterType": item.water_type,
                        "sampleCount": 1,
                        "confidence": round(item.confidence * 100, 1) if item.confidence <= 1 else item.confidence,
                        "verificationStatus": item.review_status,
                        "recordType": "local-sampling",
                        "imageUrl": item.image_url,
                        "detailUrl": "",
                    }
                ],
            )
    return asdict(item)


def parse_sampling_coordinates(sample_info: dict[str, Any]) -> tuple[float, float] | None:
    gps = str(sample_info.get("gps") or sample_info.get("coordinates") or "").replace("，", ",")
    if "," in gps:
        left, right = gps.split(",", 1)
        try:
            return float(left.strip()), float(right.strip())
        except ValueError:
            return None
    return None


@app.get("/api/records")
def records() -> Any:
    user = current_user()
    if user:
        return jsonify({"items": history_for_user(user)})
    return jsonify({"items": []})


@app.get("/api/product-data")
def product_data() -> Any:
    return jsonify(product_records())


@app.get("/api/distribution/records")
def distribution_records_api() -> Any:
    filters = dict(request.args)
    with db() as conn:
        records = getDistributionRecords(conn, filters)
    return jsonify({"items": records, "total": len(records), "filters": filters})


@app.get("/api/distribution/geojson")
def distribution_geojson_api() -> Any:
    filters = dict(request.args)
    with db() as conn:
        records = getDistributionRecords(conn, filters)
    return jsonify(to_geojson(records))


@app.get("/api/distribution/species-summary")
def distribution_species_summary_api() -> Any:
    species_name = request.args.get("species", "全部")
    filters = dict(request.args)
    with db() as conn:
        records = getDistributionRecords(conn, filters)
    return jsonify(getSpeciesDistributionSummary(records, species_name))


@app.get("/api/distribution/region-summary")
def distribution_region_summary_api() -> Any:
    filters = dict(request.args)
    with db() as conn:
        records = getDistributionRecords(conn, filters)
    return jsonify(getRegionDistributionSummary(records, filters))


@app.post("/api/distribution/sync/gbif")
def sync_gbif_distribution_api() -> Any:
    payload = request.get_json(silent=True) or {}
    records = fetchGbifOccurrences(payload)
    with db() as conn:
        count = cacheDistributionRecords(conn, records)
    return jsonify({"ok": True, "source": "GBIF", "cached": count})


@app.post("/api/distribution/sync/inaturalist")
def sync_inaturalist_distribution_api() -> Any:
    payload = request.get_json(silent=True) or {}
    records = fetchINaturalistObservations(payload)
    with db() as conn:
        count = cacheDistributionRecords(conn, records)
    return jsonify({"ok": True, "source": "iNaturalist", "cached": count})


@app.post("/api/distribution/sync/desmid-genera")
def sync_desmid_genera_distribution_api() -> Any:
    payload = request.get_json(silent=True) or {}
    source = str(payload.get("source") or "GBIF")
    per_genus_limit = min(int(payload.get("limit") or 20), 100)
    replace = bool(payload.get("replace", True))
    records: list[dict[str, Any]] = []
    synced: list[dict[str, Any]] = []
    genera = [item for item in desmid_genera_items() if item.get("scientific_genus")]
    for genus in genera:
        params = {"scientificName": genus["scientific_genus"], "limit": per_genus_limit}
        if source == "iNaturalist":
            next_records = fetchINaturalistObservations(params)
        else:
            next_records = fetchGbifOccurrences(params)
        records.extend(next_records)
        synced.append({"genus": genus["scientific_genus"], "records": len(next_records)})
        time.sleep(0.15)
    with db() as conn:
        if replace:
            conn.execute("DELETE FROM distribution_records WHERE source = ?", (source,))
        count = cacheDistributionRecords(conn, records)
    return jsonify({"ok": True, "source": source, "cached": count, "genera": len(genera), "synced": synced})


@app.get("/api/sample-records")
def sample_records() -> Any:
    return jsonify({"items": product_records()["sample_records"]})


@app.post("/api/sample-records")
def create_sample_records() -> Any:
    payload = request.get_json(silent=True) or {}
    item = create_sample_record(payload, current_user() or anonymous_user())
    return jsonify({"ok": True, "item": item})


@app.get("/api/sampling-sites")
def list_sampling_sites() -> Any:
    return jsonify({"items": product_records()["sampling_sites"]})


@app.get("/api/species-info")
def list_species_info() -> Any:
    return jsonify({"items": product_records()["species_info"]})


@app.get("/api/model-versions")
def list_model_versions() -> Any:
    return jsonify({"items": product_records()["model_versions"]})


@app.get("/api/training-datasets")
def list_training_datasets() -> Any:
    return jsonify({"items": product_records()["training_datasets"]})


@app.post("/api/review-records")
def create_review_record() -> Any:
    payload = request.get_json(silent=True) or {}
    user = current_user() or anonymous_user()
    sample_record_id = str(payload.get("sample_record_id") or payload.get("sampleRecordId") or "").strip()
    result_id = str(payload.get("result_id") or sample_record_id).strip()
    verdict = str(payload.get("verdict") or "").strip()
    if not sample_record_id:
        return jsonify({"error": "缺少 sample_record_id。"}), 400
    if verdict not in {"correct", "wrong", "uncertain"}:
        return jsonify({"error": "verdict 必须是 correct、wrong 或 uncertain。"}), 400

    created_at = now_text()
    record = ReviewRecord(
        id=uuid.uuid4().hex,
        sample_record_id=sample_record_id,
        result_id=result_id,
        verdict=verdict,
        reviewer=user.get("display_name") or user.get("username") or "未登录用户",
        note=str(payload.get("note") or ""),
        add_to_training=bool(payload.get("add_to_training") or verdict in {"correct", "wrong"}),
        created_at=created_at,
    )
    review_status = "已复核" if verdict == "correct" else "待复核"
    with db() as conn:
        conn.execute(
            """
            INSERT INTO review_records (
                id, sample_record_id, result_id, user_id, reviewer, verdict,
                note, add_to_training, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record.id,
                record.sample_record_id,
                record.result_id,
                user["id"],
                record.reviewer,
                record.verdict,
                record.note,
                int(record.add_to_training),
                record.created_at,
            ),
        )
        conn.execute(
            "UPDATE sample_records SET review_status = ?, updated_at = ? WHERE id = ?",
            (review_status, created_at, sample_record_id),
        )
    return jsonify({"ok": True, "item": asdict(record)})


@app.post("/api/training-datasets/add-sample")
def add_training_sample() -> Any:
    payload = request.get_json(silent=True) or {}
    sample_record_id = str(payload.get("sample_record_id") or payload.get("sampleRecordId") or "").strip()
    category = str(payload.get("category") or "").strip()
    if not sample_record_id:
        return jsonify({"error": "缺少 sample_record_id。"}), 400
    with db() as conn:
        row = conn.execute("SELECT species FROM sample_records WHERE id = ?", (sample_record_id,)).fetchone()
        target_category = category or (row["species"] if row else "未分类鼓藻")
        conn.execute(
            "UPDATE sample_records SET in_training_set = 1, updated_at = ? WHERE id = ?",
            (now_text(), sample_record_id),
        )
        conn.execute(
            """
            INSERT INTO training_datasets (
                id, category, train_count, validation_count, test_count,
                accuracy, most_confused_with, updated_at
            ) VALUES (?, ?, 1, 0, 0, 0, '', ?)
            ON CONFLICT(id) DO UPDATE SET
                train_count = train_count + 1,
                updated_at = excluded.updated_at
            """,
            (f"DS-{target_category}", target_category, now_text()),
        )
    return jsonify({"ok": True, "sample_record_id": sample_record_id, "category": target_category})


@app.post("/api/batch")
def batch() -> Any:
    files = request.files.getlist("images") or request.files.getlist("image")
    if not files:
        return jsonify({"error": "请上传字段名为 images 的图片文件。"}), 400

    conf = parse_confidence()
    items = []
    failed_count = 0
    host = request.host_url.rstrip("/")

    for index, file in enumerate(files):
        original_name = secure_filename(file.filename or f"sample-{index + 1}.jpg")
        if not original_name or not allowed_file(original_name):
            failed_count += 1
            items.append(
                {
                    "name": original_name or f"sample-{index + 1}",
                    "imageName": original_name or f"sample-{index + 1}",
                    "species": "识别失败",
                    "scientific_name": "Unknown",
                    "confidence": 0,
                    "similar": "文件格式不支持",
                    "time": "0s",
                    "processingTime": "0s",
                    "status": "识别失败",
                    "reviewStatus": "待复核",
                    "detections": [],
                    "alternatives": [],
                    "species_ranking": [],
                }
            )
            continue

        suffix = Path(original_name).suffix.lower() or ".png"
        saved_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:10]}{suffix}"
        image_path = UPLOAD_DIR / saved_filename
        file.save(image_path)

        try:
            image_metrics = inspect_image(image_path)
            prediction = run_yolo_prediction(image_path, image_metrics, conf)
            result_filename = f"{Path(saved_filename).stem}_result.jpg"
            draw_result_image(image_path, prediction.get("detections", []), result_filename)
            confidence = float(prediction.get("confidence", 0))
            detection_count = int(prediction.get("cell_count", 0))
            candidates = prediction.get("species_ranking") or prediction.get("alternatives") or []
            similar = "、".join(str(item.get("species")) for item in candidates[1:4] if item.get("species"))
            has_ai_candidate = detection_count == 0 and confidence > 0
            status = (
                "AI候选待复核"
                if has_ai_candidate
                else ("未检测到" if detection_count == 0 else ("低置信度" if confidence < 0.8 else "已识别"))
            )
            items.append(
                {
                    "name": original_name,
                    "imageName": original_name,
                    "species": prediction.get("species", "未检测到鼓藻目标"),
                    "scientific_name": prediction.get("scientific_name", "Unknown"),
                    "confidence": confidence,
                    "similar": similar or ("无" if detection_count == 0 else "待人工复核"),
                    "time": prediction.get("processing_time", "0s"),
                    "processingTime": prediction.get("processing_time", "0s"),
                    "status": status,
                    "reviewStatus": "待复核" if confidence < 0.8 else "未复核",
                    "operation": "查看",
                    "image_url": f"{host}/uploads/results/{result_filename}",
                    "original_image_url": f"{host}/uploads/{saved_filename}",
                    "detections": prediction.get("detections", []),
                    "alternatives": candidates,
                    "species_ranking": candidates,
                    "ai_recognition": prediction.get("ai_recognition", {}),
                    "message": prediction.get("message", ""),
                }
            )
        except Exception as exc:
            failed_count += 1
            items.append(
                {
                    "name": original_name,
                    "imageName": original_name,
                    "species": "识别失败",
                    "scientific_name": "Unknown",
                    "confidence": 0,
                    "similar": str(exc),
                    "time": "0s",
                    "processingTime": "0s",
                    "status": "识别失败",
                    "reviewStatus": "待复核",
                    "detections": [],
                    "alternatives": [],
                    "species_ranking": [],
                }
            )

    items.sort(key=lambda item: float(item.get("confidence") or 0), reverse=True)
    recognized_items = [item for item in items if item["status"] != "识别失败"]
    low_count = sum(1 for item in recognized_items if 0 <= float(item["confidence"]) < 0.8)
    average_confidence = (
        round(sum(float(item["confidence"]) for item in recognized_items) / len(recognized_items), 4)
        if recognized_items
        else 0
    )
    task_id = f"BAT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    user = current_user() or anonymous_user()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO batch_tasks (
                id, user_id, total_images, recognized, failed, low_confidence,
                review_pending, result_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task_id,
                user["id"],
                len(items),
                len(recognized_items),
                failed_count,
                low_count,
                low_count,
                json.dumps(items, ensure_ascii=False),
                now_text(),
            ),
        )
    return jsonify(
        {
            "task_id": task_id,
            "items": items,
            "summary": {
                "total": len(items),
                "average_confidence": average_confidence,
                "low_confidence": low_count,
                "review_pending": low_count,
                "failed": failed_count,
                "generated_at": now_text(),
            },
        }
    )


@app.post("/api/ecology")
def ecology() -> Any:
    payload = request.get_json(silent=True) or {}
    place = str(payload.get("place") or "未填写采样地点")
    ph = float(payload.get("ph") or 7.2)
    transparency = float(payload.get("transparency") or 36)
    reference_state = (
        "采样信息与鼓藻组成显示水体状态具备进一步观察价值，当前结论仅作为辅助判断。"
        if 6.5 <= ph <= 8.2 and transparency >= 30
        else "部分采样指标偏离常见参考范围，建议增加重复样本并结合理化指标进一步验证。"
    )
    return jsonify(
        {
            "place": place,
            "diversity": {"species_count": 5, "level": "中等偏高"},
            "dominant_species": "双星鼓藻",
            "composition": [
                {"label": "双星鼓藻", "value": 42},
                {"label": "新月鼓藻", "value": 31},
                {"label": "角星鼓藻", "value": 18},
                {"label": "棒形鼓藻", "value": 12},
            ],
            "reference_state": reference_state,
            "sampling_suggestion": "建议在同一水域上游、下游和岸边水草区继续采样，并保留原始显微图像用于人工复核。",
            "generated_at": now_text(),
        }
    )


@app.post("/api/report")
def report_preview() -> Any:
    payload = request.get_json(silent=True) or {}
    return jsonify(
        {
            "result_id": payload.get("result_id") or f"REPORT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "project_name": "鼓藻智析平台",
            "generated_at": now_text(),
            "content": payload,
        }
    )


@app.post("/api/feedback")
def feedback() -> Any:
    user, error = require_user()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    result_id = str(payload.get("result_id", "")).strip()
    verdict = str(payload.get("verdict", "")).strip()
    note = str(payload.get("note", "")).strip()

    if not result_id:
        return jsonify({"error": "缺少 result_id。"}), 400
    if verdict not in {"correct", "uncertain", "wrong"}:
        return jsonify({"error": "verdict 必须是 correct、uncertain 或 wrong。"}), 400
    if record_for_user(result_id, user) is None:
        return jsonify({"error": "未找到可反馈的识别报告。"}), 404

    item = {
        "id": uuid.uuid4().hex,
        "result_id": result_id,
        "verdict": verdict,
        "note": note,
        "user": public_user(user),
        "created_at": now_text(),
    }
    with db() as conn:
        conn.execute(
            """
            INSERT INTO feedback (id, result_id, user_id, verdict, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (item["id"], result_id, user["id"], verdict, note, item["created_at"]),
        )
    return jsonify({"ok": True, "item": item})


def handle_detection_request() -> Any:
    user = current_user() or anonymous_user()
    if "image" not in request.files:
        return jsonify({"error": "请上传字段名为 image 的图片文件。"}), 400

    image = request.files["image"]
    if image.filename == "":
        return jsonify({"error": "未选择图片文件。"}), 400
    if not allowed_file(image.filename):
        return jsonify({"error": "仅支持 PNG、JPG、JPEG、WEBP、BMP 格式图片。"}), 400

    original_name = secure_filename(image.filename)
    suffix = Path(original_name).suffix.lower() or ".png"
    saved_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:10]}{suffix}"
    image_path = UPLOAD_DIR / saved_filename
    image.save(image_path)

    try:
        image_metrics = inspect_image(image_path)
    except Exception:
        image_path.unlink(missing_ok=True)
        return jsonify({"error": "图片无法读取，请确认文件是清晰、完整的显微图。"}), 400

    conf = parse_confidence()
    try:
        prediction = run_yolo_prediction(image_path, image_metrics, conf)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc), "model_path": str(MODEL_PATH)}), 500

    result_filename = f"{Path(saved_filename).stem}_result.jpg"
    draw_result_image(image_path, prediction.get("detections", []), result_filename)

    report = build_response(prediction, saved_filename, result_filename, image_metrics, user, conf)
    save_record(report, user)
    return jsonify(report)


@app.post("/api/detect")
def detect() -> Any:
    return handle_detection_request()


@app.post("/api/predict")
def predict() -> Any:
    return handle_detection_request()


@app.get("/api/reports/<result_id>/csv")
def export_csv(result_id: str) -> Any:
    user = current_user() or anonymous_user()
    report = record_for_user(result_id, user)
    if report is None:
        return jsonify({"error": "未找到该识别报告。"}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["字段", "值"])
    for row in report["structured_table"]:
        writer.writerow([row["field"], row["value"]])
    writer.writerow([])
    writer.writerow(["候选分类", "拉丁名", "置信度", "依据"])
    for item in report.get("species_ranking") or report.get("alternatives") or []:
        writer.writerow([item["species"], item["scientific_name"], item["confidence"], item["reason"]])

    data = io.BytesIO(output.getvalue().encode("utf-8-sig"))
    return send_file(
        data,
        mimetype="text/csv; charset=utf-8",
        as_attachment=True,
        download_name=f"{result_id}.csv",
    )


@app.get("/api/reports/<result_id>/pdf")
def export_pdf(result_id: str) -> Any:
    user = current_user() or anonymous_user()
    report = record_for_user(result_id, user)
    if report is None:
        return jsonify({"error": "未找到该识别报告。"}), 404

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    except Exception:
        return jsonify({"error": "PDF 导出依赖 reportlab 未安装，请执行 pip install -r requirements.txt。"}), 500

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=18 * mm)
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = "STSong-Light"

    story: list[Any] = [
        Paragraph("鼓藻显微图识别报告", styles["Title"]),
        Spacer(1, 8),
        Paragraph(f"报告编号：{report['result_id']}", styles["Normal"]),
        Paragraph(f"识别时间：{report['identify_time']}", styles["Normal"]),
        Spacer(1, 10),
    ]

    table_data = [["字段", "结果"]] + [[row["field"], row["value"]] for row in report["structured_table"]]
    table = Table(table_data, colWidths=[45 * mm, 115 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dff7f2")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#8bb8c8")),
                ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6fbff")]),
            ]
        )
    )
    story.extend([table, Spacer(1, 12)])
    ranking = report.get("species_ranking") or report.get("alternatives") or []
    story.append(Paragraph("候选种类排序", styles["Heading2"]))
    if ranking:
        ranking_rows = [["排名", "候选种类", "拉丁名", "置信度", "来源", "依据"]]
        for index, item in enumerate(ranking[:12]):
            ranking_rows.append(
                [
                    str(index + 1),
                    Paragraph(str(item.get("species") or ""), styles["BodyText"]),
                    Paragraph(str(item.get("scientific_name") or ""), styles["BodyText"]),
                    f"{round(float(item.get('confidence') or 0) * 100, 1)}%",
                    Paragraph(str(item.get("source") or ""), styles["BodyText"]),
                    Paragraph(str(item.get("reason") or ""), styles["BodyText"]),
                ]
            )
        ranking_table = Table(ranking_rows, colWidths=[12 * mm, 32 * mm, 35 * mm, 20 * mm, 24 * mm, 55 * mm])
        ranking_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e7f5ff")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#8bb8c8")),
                    ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fbff")]),
                ]
            )
        )
        story.extend([ranking_table, Spacer(1, 12)])
    else:
        story.extend([Paragraph("未生成候选种类排序。", styles["BodyText"]), Spacer(1, 12)])

    ai = (report.get("analysis") or {}).get("ai") or {}
    if ai:
        story.append(Paragraph("AI 复核摘要", styles["Heading2"]))
        story.append(Paragraph(str(ai.get("summary") or "无 AI 摘要。"), styles["BodyText"]))
        if ai.get("error"):
            story.append(Paragraph(f"AI 状态：{ai.get('error')}", styles["BodyText"]))
        story.append(Spacer(1, 10))

    story.append(Paragraph("形态依据", styles["Heading2"]))
    story.extend(Paragraph(str(item), styles["BodyText"]) for item in (report.get("analysis") or {}).get("explainability", []))
    story.append(Spacer(1, 10))
    story.append(Paragraph("图像质量建议", styles["Heading2"]))
    recommendations = (report.get("quality") or {}).get("recommendations") or ["图像质量未给出额外建议。"]
    story.extend(Paragraph(str(item), styles["BodyText"]) for item in recommendations)

    doc.build(story)
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{result_id}.pdf",
    )


@app.get("/api/batch/<task_id>/pdf")
def export_batch_pdf(task_id: str) -> Any:
    user = current_user() or anonymous_user()
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM batch_tasks WHERE id = ? AND user_id = ?",
            (task_id, user["id"]),
        ).fetchone()
    if row is None:
        return jsonify({"error": "未找到该批量识别任务。"}), 404

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    except Exception:
        return jsonify({"error": "PDF 导出依赖 reportlab 未安装，请执行 pip install -r requirements.txt。"}), 500

    items = json.loads(row["result_json"] or "[]")
    items.sort(key=lambda item: float(item.get("confidence") or 0), reverse=True)
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=16 * mm)
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = "STSong-Light"

    story: list[Any] = [
        Paragraph("鼓藻批量识别报告", styles["Title"]),
        Spacer(1, 8),
        Paragraph(f"任务编号：{row['id']}", styles["Normal"]),
        Paragraph(f"生成时间：{now_text()}", styles["Normal"]),
        Paragraph(
            f"总图片数：{row['total_images']}；已识别：{row['recognized']}；低置信度：{row['low_confidence']}；识别失败：{row['failed']}",
            styles["Normal"],
        ),
        Spacer(1, 10),
    ]

    table_rows = [["序号", "图片名", "识别类别", "置信度", "候选排序", "状态"]]
    for index, item in enumerate(items):
        ranking = item.get("species_ranking") or item.get("alternatives") or []
        ranking_text = "；".join(
            f"{rank + 1}. {candidate.get('species')} {round(float(candidate.get('confidence') or 0) * 100, 1)}%"
            for rank, candidate in enumerate(ranking[:3])
        )
        table_rows.append(
            [
                str(index + 1),
                Paragraph(str(item.get("imageName") or item.get("name") or ""), styles["BodyText"]),
                Paragraph(str(item.get("species") or ""), styles["BodyText"]),
                f"{round(float(item.get('confidence') or 0) * 100, 1)}%",
                Paragraph(ranking_text or "无", styles["BodyText"]),
                Paragraph(str(item.get("status") or ""), styles["BodyText"]),
            ]
        )
    result_table = Table(table_rows, colWidths=[11 * mm, 36 * mm, 34 * mm, 18 * mm, 70 * mm, 24 * mm])
    result_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dff7f2")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#8bb8c8")),
                ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6fbff")]),
            ]
        )
    )
    story.extend([result_table, Spacer(1, 12)])
    story.append(Paragraph("说明", styles["Heading2"]))
    story.append(Paragraph("表格已按最高置信度从高到低排列；候选排序为 YOLO 与可用 AI 大模型复核后的种类排名。", styles["BodyText"]))

    doc.build(story)
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{task_id}.pdf",
    )


@app.get("/uploads/<path:filename>")
def uploaded_file(filename: str) -> Any:
    return send_from_directory(UPLOAD_DIR, filename)


@app.errorhandler(413)
def file_too_large(_: Exception) -> Any:
    return jsonify({"error": "图片大小不能超过 12MB。"}), 413


def initialize_model() -> None:
    get_yolo_model(strict=True)
    print(f"YOLO 模型已加载：{MODEL_PATH}，device={_yolo_device}", flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", "5000"))
    initialize_model()
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
