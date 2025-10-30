
import React from 'react';

export const TargetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <circle cx="12" cy="12" r="10.5" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
);
