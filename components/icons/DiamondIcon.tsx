import React from 'react';

export const DiamondIcon: React.FC<{ className?: string } & React.SVGProps<SVGSVGElement>> = ({ className, ...props }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
        <path d="M12.8465 0.63897C12.4465 0.23897 11.8135 0.23897 11.4135 0.63897L0.638896 11.4136C0.238896 11.8136 0.238896 12.4466 0.638896 12.8466L11.4135 23.6212C11.8135 24.0212 12.4465 24.0212 12.8465 23.6212L23.6211 12.8466C24.0211 12.4466 24.0211 11.8136 23.6211 11.4136L12.8465 0.63897Z"/>
    </svg>
);