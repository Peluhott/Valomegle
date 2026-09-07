import type { ReactNode } from 'react';
import Nav from './Nav';

type AppShellProps = {
    children: ReactNode;
    rightRail: ReactNode;
};

// Shared page shell for the home and profile views: the centered outer card with
// the top nav and a two-column body (form left, rail right) that collapses to a
// single column below ~1040px.
const AppShell = ({ children, rightRail }: AppShellProps) => {
    return (
        <div className="min-h-screen bg-canvas py-14">
            <div className="mx-auto max-w-[1240px] bg-surface border border-[#c9c9c3] rounded-tile overflow-hidden">
                <Nav />
                <div className="grid grid-cols-1 min-[1040px]:grid-cols-[1fr_340px] gap-10 px-8 pt-11 pb-12 items-start">
                    <div className="min-w-0">{children}</div>
                    <div>{rightRail}</div>
                </div>
            </div>
        </div>
    );
};

export default AppShell;
