export default function LowStockList() {
  const items = [
    { name: 'Medicine Name 1', count: 4,  color: '#3b82f6' },
    { name: 'Medicine Name 2', count: 5,  color: '#8b5cf6' },
    { name: 'Medicine Name 3', count: 8,  color: '#f59e0b' },
    { name: 'Medicine Name 4', count: 10, color: '#ecc94b' },
  ]

  return (
    <div className="bg-green-800 dark:bg-[#0d3d1a] rounded-xl p-4">
      <p className="text-white dark:text-[#c0e8c0] font-medium text-xs mb-4 text-center uppercase tracking-wide">
        Lowest Medicine Stock
      </p>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-white dark:text-[#c0e8c0] text-sm font-medium">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }}></span>
            {item.name}:
            <span className="ml-auto">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}