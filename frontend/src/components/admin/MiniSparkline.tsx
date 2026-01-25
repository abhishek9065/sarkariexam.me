import './MiniSparkline.css';

interface MiniSparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: 'blue' | 'green' | 'yellow' | 'red';
    showChange?: boolean;
}

export function MiniSparkline({
    data,
    width = 80,
    height = 32,
    color = 'blue',
    showChange = true,
}: MiniSparklineProps) {
    if (!data || data.length === 0) {
        return <div className="mini-sparkline-empty">No data</div>;
    }

    const max = Math.max(1, ...data);
    const bars = data.slice(-7); // Last 7 values

    // Calculate change percentage
    const lastValue = bars[bars.length - 1] || 0;
    const prevValue = bars[bars.length - 2] || 0;
    const change = prevValue > 0
        ? Math.round(((lastValue - prevValue) / prevValue) * 100)
        : lastValue > 0 ? 100 : 0;
    const changeDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

    return (
        <div className="mini-sparkline-wrapper">
            <div
                className={`mini-sparkline ${color}`}
                style={{ width, height }}
                role="img"
                aria-label={`Trend: ${bars.join(', ')}`}
            >
                {bars.map((value, index) => {
                    const barHeight = Math.max(2, (value / max) * height);
                    return (
                        <div
                            key={index}
                            className="mini-sparkline-bar"
                            style={{
                                height: `${barHeight}px`,
                                opacity: 0.4 + (index / bars.length) * 0.6,
                            }}
                            title={`${value.toLocaleString()}`}
                        />
                    );
                })}
            </div>
            {showChange && (
                <span className={`mini-sparkline-change ${changeDirection}`}>
                    {changeDirection === 'up' && '↑'}
                    {changeDirection === 'down' && '↓'}
                    {Math.abs(change)}%
                </span>
            )}
        </div>
    );
}

export default MiniSparkline;
