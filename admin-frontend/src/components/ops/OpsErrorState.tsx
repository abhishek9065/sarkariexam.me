type OpsErrorStateProps = {
    message: string;
};

export function OpsErrorState({ message }: OpsErrorStateProps) {
    return (
        <div className="ops-error" role="alert">
            {message}
        </div>
    );
}
