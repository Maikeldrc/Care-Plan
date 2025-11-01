
import React from 'react';

export const PackageIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        {title && <title>{title}</title>}
        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2"></path>
        <path d="M21 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <path d="M3 10l9 5 9-5"></path>
        <path d="M12 22V15"></path>
        <path d="m3.5 11 8.5 5 8.5-5"></path>
        <path d="M12 3.5 3.5 8.5 12 13l8.5-4.5z"></path>
    </svg>
);
