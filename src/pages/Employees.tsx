import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Trash,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db, auth } from "../lib/firebase.ts";
import { deleteUser } from "firebase/auth";
import {
  deleteDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { format, subDays, isAfter, isBefore, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

const statusStyles = {
  Active: "bg-success/10 text-success border-success/20",
  "On Leave": "bg-warning/10 text-warning border-warning/20",
  Inactive: "bg-muted text-muted-foreground border-muted",
  "Absent (3+ days)": "bg-destructive/10 text-destructive border-destructive/20",
  "HalfDay Regularly": "bg-orange-100 text-orange-800 border-orange-200",
  default: "bg-success/10 text-success border-success/20",
};

const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      const empSnap = await getDocs(collection(db, "employees"));
      const empList = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);

      const attSnap = await getDocs(collection(db, "attendance"));
      const allAttendance = attSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date || "",
          attendanceDate: data.date ? new Date(data.date) : null
        };
      });

      const recentAttendance = allAttendance.filter(record => {
        if (!record.attendanceDate) return false;
        return isAfter(record.attendanceDate, thirtyDaysAgo) ||
          isSameDay(record.attendanceDate, thirtyDaysAgo);
      });
      setAttendanceRecords(recentAttendance);

      const leaveSnap = await getDocs(collection(db, "employee_leaves"));
      const leaveList = leaveSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLeaveRecords(leaveList);

      const processedEmployees = await processEmployeeStatus(empList, recentAttendance, leaveList);
      setEmployees(processedEmployees);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employee data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processEmployeeStatus = async (employees: any[], attendance: any[], leaves: any[]) => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    const thirtyDaysAgo = subDays(today, 30);

    return Promise.all(employees.map(async (emp) => {
      const empAttendance = attendance.filter(record => record.empId === emp.id);

      const empLeaves = leaves.filter(leave =>
        leave.employeeId === emp.id &&
        leave.status === "approved"
      );

      const isCurrentlyOnLeave = empLeaves.some(leave => {
        if (!leave.startDate || !leave.endDate) return false;

        const startDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        const endDate = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);

        return isAfter(today, startDate) && isBefore(today, endDate) ||
          isSameDay(today, startDate) ||
          isSameDay(today, endDate);
      });

      if (isCurrentlyOnLeave) {
        const updatedEmp = { ...emp, status: "On Leave" };
        await updateEmployeeStatus(emp.id, "On Leave");
        return updatedEmp;
      }

      const last7DaysAttendance = empAttendance.filter(record => {
        if (!record.attendanceDate) return false;
        return isAfter(record.attendanceDate, sevenDaysAgo) ||
          isSameDay(record.attendanceDate, sevenDaysAgo);
      });

      const last30DaysAttendance = empAttendance.filter(record => {
        if (!record.attendanceDate) return false;
        return isAfter(record.attendanceDate, thirtyDaysAgo) ||
          isSameDay(record.attendanceDate, thirtyDaysAgo);
      });

      const presentDays = last7DaysAttendance.filter(a => a.status === "Present").length;
      const lateDays = last7DaysAttendance.filter(a => a.status === "HalfDay").length;
      const absentDays = last7DaysAttendance.filter(a => a.status === "Absent").length;
      const checkedInDays = last7DaysAttendance.filter(a => a.status === "Checked-in").length;

      let newStatus = "Active";

      const sortedAttendance = [...last7DaysAttendance]
        .sort((a, b) => a.attendanceDate?.getTime() - b.attendanceDate?.getTime());

      let consecutiveAbsentDays = 0;
      let maxConsecutiveAbsent = 0;

      for (let i = 0; i < 7; i++) {
        const currentDate = subDays(today, i);
        const attendanceForDay = sortedAttendance.find(a =>
          a.attendanceDate && isSameDay(a.attendanceDate, currentDate)
        );

        if (attendanceForDay?.status === "Absent" || !attendanceForDay) {
          consecutiveAbsentDays++;
          maxConsecutiveAbsent = Math.max(maxConsecutiveAbsent, consecutiveAbsentDays);
        } else {
          consecutiveAbsentDays = 0;
        }
      }

      if (lateDays >= 3) {
        newStatus = "HalfDay Regularly";
      }

      if (maxConsecutiveAbsent >= 3) {
        newStatus = "Absent (3+ days)";
      }

      if (emp.status === "Inactive") {
        newStatus = "Inactive";
      }

      if (last30DaysAttendance.length === 0 && !isCurrentlyOnLeave) {
        newStatus = "Inactive";
      }

      if (emp.status !== newStatus) {
        await updateEmployeeStatus(emp.id, newStatus);
      }

      return { ...emp, status: newStatus };
    }));
  };

  const updateEmployeeStatus = async (employeeId: string, status: string) => {
    try {
      const employeeRef = doc(db, "employees", employeeId);
      await updateDoc(employeeRef, {
        status: status,
        statusUpdatedAt: new Date().toISOString()
      });
      console.log(`Updated employee ${employeeId} status to ${status}`);
    } catch (error) {
      console.error(`Error updating employee ${employeeId} status:`, error);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
    return (
      (name.includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "all" || emp.status === statusFilter)
    );
  });

  const perPage = Number(itemsPerPage);
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / perPage);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handleDelete = async (employee: any) => {
    try {
      // UI se remove
      setEmployees(prev => prev.filter(emp => emp.id !== employee.id));

      // employees collection
      await deleteDoc(doc(db, "employees", employee.id));

      // users collection
      await deleteDoc(doc(db, "users", employee.id));

      // attendance records
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("empId", "==", employee.id)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      for (const d of attendanceSnap.docs) {
        await deleteDoc(d.ref);
      }

      // leave records
      const leaveQuery = query(
        collection(db, "employee_leaves"),
        where("employeeId", "==", employee.id)
      );
      const leaveSnap = await getDocs(leaveQuery);
      for (const d of leaveSnap.docs) {
        await deleteDoc(d.ref);
      }

      toast({
        title: "Employee Deleted",
        description: "Employee ka sara Firestore data permanently delete ho gaya",
      });

    } catch (error) {
      console.error(error);

      setEmployees(prev => [...prev, employee]);

      toast({
        title: "Error",
        description: "Employee delete nahi ho saka",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    fetchAllData();
    toast({
      title: "Refreshing",
      description: "Updating employee status based on latest attendance...",
    });
  };

  return (
    <DashboardLayout title="Employees" subtitle="Manage your workforce with real-time attendance tracking">
      <div className="bg-card rounded-xl shadow-card animate-slide-up">

        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="HalfDayRegularly">HalfDayRegularly</SelectItem>
                  <SelectItem value="Absent (3+ days)">Absent (3+ days)</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden md:inline md:ml-2">Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 md:hidden" />
                    <span className="hidden md:inline">Refresh</span>
                  </>
                )}
              </Button>

              <Button variant="gradient" asChild>
                <Link to="/add-employee">+ Add Employee</Link>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Analyzing Employee Data...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-gray-600">No employee records found</p>
            <p className="text-sm text-gray-500 mt-1">Try changing your search or filters</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((employee, index) => {
                  const empAttendance = attendanceRecords.filter(record => record.empId === employee.id);
                  const last7DaysCount = empAttendance.filter(a => {
                    if (!a.attendanceDate) return false;
                    return isAfter(a.attendanceDate, subDays(new Date(), 7));
                  }).length;

                  const empLeaves = leaveRecords.filter(leave =>
                    leave.employeeId === employee.id && leave.status === "approved"
                  );

                  return (
                    <TableRow key={employee.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {employee.avatar ? (
                              <AvatarImage src={employee.avatar} />
                            ) : (
                              <AvatarFallback>
                                {getInitials(employee.firstName, employee.lastName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email || "-"}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Badge
                            variant="outline"
                            className={statusStyles[employee.status] || statusStyles.default}
                          >
                            {employee.status || "Active"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-transparent hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/employee/${employee.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(employee)}
                              className="text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="p-6 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Items per page:
                </span>
                <Select
                  value={itemsPerPage}
                  onValueChange={(v) => {
                    setItemsPerPage(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {totalItems === 0 ? 0 : startIndex + 1}-
                  {Math.min(endIndex, totalItems)} of {totalItems}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;