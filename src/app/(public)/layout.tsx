import { LandingNavbar } from '@/components/layout/LandingNavbar';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <LandingNavbar />
            <main className="flex-1">{children}</main>
        </div>
    );
}
