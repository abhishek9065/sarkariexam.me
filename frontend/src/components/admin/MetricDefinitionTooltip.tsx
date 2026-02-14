import type { MetricDefinition } from '../../types';

interface MetricDefinitionTooltipProps {
    definition: MetricDefinition;
}

export function MetricDefinitionTooltip({ definition }: MetricDefinitionTooltipProps) {
    return (
        <span
            className="metric-definition-tooltip"
            role="note"
            aria-label={`${definition.label}: ${definition.description}`}
            title={`${definition.label}: ${definition.description}`}
        >
            ⓘ
        </span>
    );
}

