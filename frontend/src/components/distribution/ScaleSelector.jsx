const scales = ['世界', '亚洲', '中国', '省级区域', '当前视野']

export default function ScaleSelector({ value, onChange }) {
  return (
    <div className="segmented-control">
      {scales.map((scale) => (
        <button key={scale} className={value === scale ? 'active' : ''} onClick={() => onChange(scale)}>{scale}</button>
      ))}
    </div>
  )
}
