import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from 'date-fns';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface Testimonial {
    id: string;
    name: string;
    role: string;
    company: string;
    content: string;
    rating: number;
    approved: boolean;
    created_at: string;
}

export function TestimonialManagement() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchTestimonials = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTestimonials(data || []);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to load testimonials'));
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    const handleApproval = async (id: string, approved: boolean) => {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('testimonials')
                .update({ approved })
                .eq('id', id);

            if (error) throw error;

            setTestimonials(prev => prev.map(t => t.id === id ? { ...t, approved } : t));
            showNotification(notificationHelpers.success(
                approved ? 'Approved' : 'Unapproved',
                `Testimonial has been ${approved ? 'approved' : 'unapproved'} successfully.`
            ));
        } catch (error) {
            console.error('Error updating testimonial:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to update status'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this testimonial?')) return;

        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTestimonials(prev => prev.filter(t => t.id !== id));
            showNotification(notificationHelpers.success('Deleted', 'Testimonial deleted successfully'));
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            showNotification(notificationHelpers.error('Error', 'Failed to delete testimonial'));
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        fetchTestimonials();
    }, [fetchTestimonials]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Testimonials</h2>
                    <p className="text-muted-foreground">Manage and approve user reviews.</p>
                </div>
                <Button onClick={fetchTestimonials} variant="outline" size="sm">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Reviews</CardTitle>
                    <CardDescription>
                        Approve reviews to display them on the landing page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Content</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testimonials.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No reviews found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        testimonials.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {format(new Date(t.created_at), 'MMM d, yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{t.name}</div>
                                                    <div className="text-xs text-muted-foreground">{t.role} at {t.company}</div>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <p className="truncate" title={t.content}>"{t.content}"</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex text-yellow-500">
                                                        {Array.from({ length: t.rating }).map((_, i) => (
                                                            <span key={i}>★</span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={t.approved ? "default" : "secondary"} className={t.approved ? "bg-green-500 hover:bg-green-600" : ""}>
                                                        {t.approved ? "Approved" : "Pending"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {!t.approved ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleApproval(t.id, true)}
                                                                disabled={processingId === t.id}
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                            >
                                                                {processingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                                Approve
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleApproval(t.id, false)}
                                                                disabled={processingId === t.id}
                                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                                            >
                                                                {processingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                                Unapprove
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(t.id)}
                                                            disabled={processingId === t.id}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
