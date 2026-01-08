import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
    Youtube,
    Trash2,
    Plus,
    Loader2,
    Globe,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface SocialLink {
    id: string;
    platform: string;
    url: string;
    is_active: boolean;
}

export function SocialMediaManagement() {
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLink, setNewLink] = useState({ platform: 'facebook', url: '' });
    const [submitting, setSubmitting] = useState(false);
    const { showNotification } = useNotification();

    const platforms = [
        { value: 'facebook', label: 'Facebook', icon: Facebook },
        { value: 'twitter', label: 'Twitter', icon: Twitter },
        { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
        { value: 'instagram', label: 'Instagram', icon: Instagram },
        { value: 'youtube', label: 'YouTube', icon: Youtube },
        { value: 'website', label: 'Website', icon: Globe },
    ];

    const fetchLinks = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('social_media_links')
                .select('*')
                .order('platform');

            if (error) throw error;
            setLinks(data || []);
        } catch (error) {
            console.error('Error fetching social links:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to load social media links.'));
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const handleAddLink = async () => {
        try {
            setSubmitting(true);
            const { data, error } = await supabase
                .from('social_media_links')
                .insert([{ platform: newLink.platform, url: newLink.url, is_active: true }])
                .select()
                .single();

            if (error) throw error;

            setLinks([...links, data]);
            setIsModalOpen(false);
            setNewLink({ platform: 'facebook', url: '' });
            showNotification(notificationHelpers.success('Success', 'Social link added successfully.'));
        } catch (error) {
            console.error('Error adding link:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to add social link.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('social_media_links')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setLinks(links.filter(l => l.id !== id));
            showNotification(notificationHelpers.success('Success', 'Social link deleted.'));
        } catch (error) {
            console.error('Error deleting link:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to delete social link.'));
        }
    };

    const toggleStatus = async (link: SocialLink) => {
        try {
            const { error } = await supabase
                .from('social_media_links')
                .update({ is_active: !link.is_active })
                .eq('id', link.id);

            if (error) throw error;

            setLinks(links.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
        } catch (error) {
            console.error('Error updating status:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to update status.'));
        }
    };

    const getIcon = (platform: string) => {
        const p = platforms.find(p => p.value === platform);
        return p ? <p.icon className="w-5 h-5" /> : <Globe className="w-5 h-5" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Social Media Links</h2>
                    <p className="text-gray-500">Manage your social media presence in the footer.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Platform</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead>Status</TableHead>
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
                        ) : links.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    No social links added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            links.map((link) => (
                                <TableRow key={link.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                                {getIcon(link.platform)}
                                            </div>
                                            <span className="capitalize font-medium">{link.platform}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-gray-600 max-w-[300px] truncate">
                                        {link.url}
                                    </TableCell>
                                    <TableCell>
                                        <button onClick={() => toggleStatus(link)} className="focus:outline-none">
                                            {link.is_active ? (
                                                <ToggleRight className="w-8 h-8 text-green-500 transition-colors" />
                                            ) : (
                                                <ToggleLeft className="w-8 h-8 text-gray-300 transition-colors" />
                                            )}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(link.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Social Media Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Platform</Label>
                            <select
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newLink.platform}
                                onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                            >
                                {platforms.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL</Label>
                            <Input
                                placeholder="https://..."
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddLink} disabled={!newLink.url || submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
