interface Props {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export default function Sparkline({ data, color = '#00A3FF', height = 40, width = 160 }: Props) {
  if (data.length < 2) return <div className="h-10" />;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  
  const path = `M ${points.join(' L ')}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={`${path} L ${width},${height} L 0,${height} Z`}
        fill={color}
        opacity={0.15}
      />
    </svg>
  );
}
