import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCcw, Trash2, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Enquiry {
    id: string;
    name: string;
    company_name: string;
    contact_number: string;
    address: string;
    remarks: string;
    status: string;
    created_at: string;
}

export function EnquiryManagement() {
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [enquiryToDelete, setEnquiryToDelete] = useState<string | null>(null);

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('enquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching enquiries:', error);
            } else {
                setEnquiries(data || []);
            }
        } catch (error) {
            console.error('Unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const { error } = await supabase
                .from('enquiries')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            setEnquiries(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting enquiry:', error);
            alert('Failed to delete enquiry. Please try again.');
        } finally {
            setDeletingId(null);
            setEnquiryToDelete(null);
        }
    };

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const filteredEnquiries = enquiries.filter(enquiry =>
        enquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.contact_number.includes(searchTerm)
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <Badge className="bg-blue-500">New</Badge>;
            case 'contacted': return <Badge className="bg-yellow-500">Contacted</Badge>;
            case 'resolved': return <Badge className="bg-green-500">Resolved</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Enquiries</h2>
                    <p className="text-muted-foreground">Manage incoming enquiries from the landing page.</p>
                </div>
                <Button onClick={fetchEnquiries} variant="outline" size="sm">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Enquiries</CardTitle>
                    <CardDescription>
                        A list of all submitted enquiries.
                    </CardDescription>
                    <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, company, or contact..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 max-w-sm"
                            />
                        </div>
                    </div>
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
                                        <TableHead>Name</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Remarks</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEnquiries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                No enquiries found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredEnquiries.map((enquiry) => (
                                            <TableRow key={enquiry.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {format(new Date(enquiry.created_at), 'PPP p')}
                                                </TableCell>
                                                <TableCell className="font-medium">{enquiry.name}</TableCell>
                                                <TableCell>{enquiry.company_name}</TableCell>
                                                <TableCell>{enquiry.contact_number}</TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={enquiry.address}>{enquiry.address || '-'}</TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={enquiry.remarks}>{enquiry.remarks || '-'}</TableCell>
                                                <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEnquiryToDelete(enquiry.id)}
                                                        disabled={deletingId === enquiry.id}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        {deletingId === enquiry.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
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

            <AlertDialog open={!!enquiryToDelete} onOpenChange={(open) => !open && setEnquiryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Enquiry?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this enquiry? This action cannot be undone and will permanently remove the data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => enquiryToDelete && handleDelete(enquiryToDelete)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
