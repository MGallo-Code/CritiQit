import { Loader } from 'lucide-react'

interface LoadingContentProps {
    heading: string;
    description: string;
    showLoader: boolean;
}

export default function LoadingContent({
    heading,
    description,
    showLoader
}: LoadingContentProps) {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="flex flex-col gap-2 items-center justify-center">
                <h1 className="text-2xl font-semibold">{heading}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
                {showLoader && <Loader className="h-4 w-4 animate-spin" />}
            </div>
        </div>
    );
}