import Sparkline from './Sparkline';

interface Props {
  title: string;
  value: string;
  unit?: string;
  history: number[];
  accent?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ title, value, unit, history, accent, icon }: Props) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{value}</span>
            {unit && <span className="text-sm text-white/40">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="text-white/40">
            {icon}
          </div>
        )}
      </div>
      <Sparkline data={history} color={accent || '#00A3FF'} />
    </div>
  );
}
