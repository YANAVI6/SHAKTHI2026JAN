import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/landing/components/landing/navbar';
import Footer from '@/components/landing/components/landing/footer';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageContent {
    title: string;
    content: string;
    last_updated: string;
}

interface PublicPageProps {
    pageSlug?: string;
}

export default function PublicPage({ pageSlug }: PublicPageProps) {
    const { slug } = useParams<{ slug: string }>();
    const [page, setPage] = useState<PageContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Use prop first, then param, then fallback to path parsing (legacy/fallback)
        let targetSlug = pageSlug || slug;

        if (!targetSlug) {
            const currentPath = window.location.pathname.replace(/^\//, ''); // Remove leading slash
            targetSlug = currentPath;
        }

        // Handle common mapping (e.g. privacy -> privacy-policy if needed, though props solve this)
        const pathToSlugMap: Record<string, string> = {
            'privacy': 'privacy-policy',
            'terms': 'terms-conditions',
        };

        if (targetSlug && pathToSlugMap[targetSlug]) {
            targetSlug = pathToSlugMap[targetSlug];
        }

        if (targetSlug) {
            fetchPage(targetSlug);
        }
    }, [slug, pageSlug]);

    const fetchPage = async (pageSlug: string) => {
        try {
            setLoading(true);
            setError(false);

            const { data, error } = await supabase
                .from('page_content')
                .select('*')
                .eq('slug', pageSlug)
                .single();

            if (error) throw error;
            setPage(data);
        } catch (err) {
            console.error('Error fetching page:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
                <p className="text-gray-400 mb-8">The content you are looking for does not exist.</p>
                <Link to="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-[#0F172A]">
                <Navbar />
            </div>

            <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12"
                >
                    <div className="mb-8 border-b border-gray-100 pb-8">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
                            {page.title}
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">
                            Last Updated: {new Date(page.last_updated).toLocaleDateString()}
                        </p>
                    </div>

                    <div
                        className="prose prose-lg prose-indigo max-w-none text-gray-600 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-indigo-600 hover:prose-a:text-indigo-700 transition-colors"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
