"use client";

type SpinnerProps = {
    size?: number;
};

export default function LoadingSpinner({ size = 40 }: SpinnerProps) {
   return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
            <div style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #333",
                borderRadius: "50%",
                width: `${size}px`,
                height: `${size}px`,
                animation: "spin 1s linear infinite",
            }}
        />
        <style jsx>{`
            @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }}
            `}
            </style>
        </div>
    );
}
