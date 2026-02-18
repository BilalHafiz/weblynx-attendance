import { useState, useEffect } from "react";
import { db } from "../../lib/firebase.ts";
import { collection, getDocs, setDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

const LeaveManagement = () => {
    const { toast } = useToast();

    const [employees, setEmployees] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        employeeId: "",
        leaveType: "",
        startDate: "",
        endDate: "",
        note: "",
    });

    const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirmLeaveId, setDeleteConfirmLeaveId] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const employeeRef = collection(db, "employees");
                const employeeSnapshot = await getDocs(employeeRef);
                const employeeList = employeeSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: `${doc.data().firstName} ${doc.data().lastName}`,
                }));
                setEmployees(employeeList);
            } catch (error) {
                console.error("Error fetching employees:", error);
                toast({
                    title: "Error",
                    description: "Failed to load employee data",
                    variant: "destructive",
                });
            }
        };

        const fetchLeaveRecords = async () => {
            try {
                const leaveRef = collection(db, "employee_leaves");
                const leaveSnapshot = await getDocs(leaveRef);
                const leaveList = leaveSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setLeaveRecords(leaveList);
            } catch (error) {
                console.error("Error fetching leave records:", error);
                toast({
                    title: "Error",
                    description: "Failed to load leave records",
                    variant: "destructive",
                });
            }
        };

        fetchEmployees();
        fetchLeaveRecords();
    }, [toast]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async () => {
        const { employeeId, leaveType, startDate, endDate, note } = formData;

        if (!employeeId || !leaveType || !startDate || !endDate) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const newLeaveDocRef = doc(collection(db, "employee_leaves"));
            await setDoc(newLeaveDocRef, {
                employeeId,
                leaveType,
                startDate: Timestamp.fromDate(new Date(startDate)),
                endDate: Timestamp.fromDate(new Date(endDate)),
                note,
                createdAt: Timestamp.now(),
            });

            toast({
                title: "Success",
                description: "Leave record added successfully!",
                variant: "default",
            });

            setFormData({
                employeeId: "",
                leaveType: "",
                startDate: "",
                endDate: "",
                note: "",
            });

            const leaveRef = collection(db, "employee_leaves");
            const leaveSnapshot = await getDocs(leaveRef);
            const leaveList = leaveSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setLeaveRecords(leaveList);
        } catch (error) {
            console.error("Error saving leave:", error);
            toast({
                title: "Error",
                description: "Failed to save leave record",
                variant: "destructive",
            });
        }

        setIsLoading(false);
    };

    const handleDeleteLeaveClick = (leaveId: string) => {
        setDeleteConfirmLeaveId(leaveId);
    };

    const handleDeleteLeaveConfirm = async () => {
        const leaveId = deleteConfirmLeaveId;
        if (!leaveId) return;

        setDeleteConfirmLeaveId(null);

        try {
            await deleteDoc(doc(db, "employee_leaves", leaveId));
            setLeaveRecords((prev) => prev.filter((l) => l.id !== leaveId));
            toast({
                title: "Success",
                description: "Leave record deleted successfully.",
                variant: "default",
            });
        } catch (error) {
            console.error("Error deleting leave:", error);
            toast({
                title: "Error",
                description: "Failed to delete leave record",
                variant: "destructive",
            });
        }
    };

    const formatLeaveDate = (value: unknown) => {
        if (!value) return "-";
        const v = value as { toDate?: () => Date };
        if (typeof v.toDate === "function") return format(v.toDate(), "MM/dd/yyyy");
        if (value instanceof Date) return format(value, "MM/dd/yyyy");
        return "-";
    };

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Leave Management</h2>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="employeeId">Employee</Label>
                    <Select
                        value={formData.employeeId}
                        onValueChange={(value) => handleInputChange("employeeId", value)}
                    >

                        <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                    {employee.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select
                        value={formData.leaveType}
                        onValueChange={(value) => handleInputChange("leaveType", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Leave Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Sick">Sick</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                            type="date"
                            id="startDate"
                            value={formData.startDate}
                            className="text-white [&::-webkit-calendar-picker-indicator]:invert"
                            onChange={(e) => handleInputChange("startDate", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                            type="date"
                            id="endDate"
                            value={formData.endDate}
                            className="text-white [&::-webkit-calendar-picker-indicator]:invert"
                            onChange={(e) => handleInputChange("endDate", e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="note">Note (Optional)</Label>
                    <Textarea
                        id="note"
                        value={formData.note}
                        onChange={(e) => handleInputChange("note", e.target.value)}
                        placeholder="Add a note (optional)"
                    />
                </div>

                <Button onClick={handleSubmit} variant="success" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Leave"}
                </Button>
            </div>

            <div className="mt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="w-[80px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaveRecords.map((leave) => (
                            <TableRow key={leave.id}>
                                <TableCell>
                                    {employees.find(emp => emp.id === leave.employeeId)?.name || "-"}
                                </TableCell>
                                <TableCell>{leave.leaveType}</TableCell>
                                <TableCell>{formatLeaveDate(leave.startDate)}</TableCell>
                                <TableCell>{formatLeaveDate(leave.endDate)}</TableCell>
                                <TableCell>{leave.note}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteLeaveClick(leave.id)}
                                        aria-label="Delete leave"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteConfirmLeaveId !== null} onOpenChange={(open) => !open && setDeleteConfirmLeaveId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete leave record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this leave record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteLeaveConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default LeaveManagement;