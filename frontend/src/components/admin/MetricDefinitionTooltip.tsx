import type { MetricDefinition } from '../../types';

interface MetricDefinitionTooltipProps {
    definition: MetricDefinition;
}

export function MetricDefinitionTooltip({ definition }: MetricDefinitionTooltipProps) {
    return (
        <button
            type="button"
            className="metric-definition-tooltip"
            aria-label={`${definition.label}: ${definition.description}`}
            title={`${definition.label}: ${definition.description}`}
        >
            ⓘ
        </button>
    );
}
