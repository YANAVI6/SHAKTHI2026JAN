import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Edit, FileText } from 'lucide-react';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface PageDoc {
    id: string;
    slug: string;
    title: string;
    content: string;
    last_updated: string;
}

export function PageDocManagement() {
    const [pages, setPages] = useState<PageDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPage, setEditingPage] = useState<PageDoc | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { showNotification } = useNotification();

    const fetchPages = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('page_content')
                .select('*')
                .order('title');

            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Error fetching pages:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to load pages.'));
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const handleUpdate = async () => {
        if (!editingPage) return;

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('page_content')
                .update({
                    content: editingPage.content,
                    title: editingPage.title,
                    last_updated: new Date().toISOString()
                })
                .eq('id', editingPage.id);

            if (error) throw error;

            setPages(pages.map(p => p.id === editingPage.id ? editingPage : p));
            setEditingPage(null);
            showNotification(notificationHelpers.success('Success', 'Page content updated successfully.'));
        } catch (error) {
            console.error('Error updating page:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to update page content.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Page Documentation</h2>
                    <p className="text-gray-500">Manage content for static pages like Contact, About, etc.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Page Title</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                                </TableCell>
                            </TableRow>
                        ) : pages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    No pages found. Run the migration script.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pages.map((page) => (
                                <TableRow key={page.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-gray-900">{page.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">
                                            /{page.slug}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {new Date(page.last_updated).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingPage(page)}
                                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Page: {editingPage?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 space-y-4 py-4 overflow-y-auto">
                        <div className="space-y-2">
                            <Label>Page Title</Label>
                            <Input
                                value={editingPage?.title || ''}
                                onChange={(e) => setEditingPage(prev => prev ? { ...prev, title: e.target.value } : null)}
                            />
                        </div>
                        <div className="space-y-2 h-full flex flex-col">
                            <Label>Content (HTML supported)</Label>
                            <Textarea
                                className="flex-1 font-mono text-sm min-h-[400px]"
                                value={editingPage?.content || ''}
                                onChange={(e) => setEditingPage(prev => prev ? { ...prev, content: e.target.value } : null)}
                            />
                            <p className="text-xs text-gray-500">
                                Tip: You can use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, etc. for formatting.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPage(null)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
