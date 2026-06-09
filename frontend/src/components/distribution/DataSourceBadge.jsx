export default function DataSourceBadge({ source }) {
  return <span className={`source-badge source-${String(source).replace(/\s+/g, '')}`}>{source}</span>
}
