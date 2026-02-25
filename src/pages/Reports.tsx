import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileSpreadsheet,
  File,
  Users,
  Building2,
  TrendingUp,
  CalendarDays,
  Palmtree,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Download,
  Printer,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface Employee {
  id: string;
  empId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  status?: string;
  createdAt?: any;
}

interface Attendance {
  id: string;
  empId: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: string;
  totalHours?: number;
}

interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: any;
  endDate: any;
  status: string;
  days?: number;
  note?: string;
}

interface Holiday {
  id: string;
  startDate: Date;
  endDate: Date;
  title: string;
  description?: string;
}

interface ReportData {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  approvedLeaves: number;
  holidays: number;
  weekendDays: number;
  attendanceRate: number;
  totalWorkHours: number;
  averageWorkHours: number;
}

export default function Reports() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("reports");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [reportType] = useState("employee");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      const empSnap = await getDocs(collection(db, "employees"));
      const employeesData: Employee[] = empSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(employeesData);

      const attSnap = await getDocs(collection(db, "attendance"));
      const attendanceData: Attendance[] = attSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[];
      setAttendance(attendanceData);

      const leaveSnap = await getDocs(collection(db, "employee_leaves"));
      const leavesData: Leave[] = leaveSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Leave[];
      setLeaves(leavesData);

      const holidaySnap = await getDocs(collection(db, "holidays"));
      const toDate = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : null);
      const holidaysData: Holiday[] = holidaySnap.docs.map((docSnap) => {
        const data = docSnap.data();
        let startDate = toDate(data.startDate);
        let endDate = toDate(data.endDate);
        if (!startDate || !endDate) {
          const single = toDate(data.date) || new Date();
          startDate = endDate = single;
        }
        return { id: docSnap.id, startDate, endDate, title: data.title || "Holiday", description: data.description } as Holiday;
      });
      setHolidays(holidaysData);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading data",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedEmployee);

  const joinDate = useMemo(() => {
    if (!selectedEmp) return null;

    if (selectedEmp.joiningDate) {
      return new Date(selectedEmp.joiningDate);
    }

    const empAttendance = attendance
      .filter(a => a.empId === selectedEmployee)
      .map(a => new Date(a.date));

    return empAttendance.length > 0
      ? new Date(Math.min(...empAttendance.map(d => d.getTime())))
      : new Date();
  }, [selectedEmp, attendance, selectedEmployee]);

  const years = useMemo(() => {
    const start = joinDate ? joinDate.getFullYear() : 2020;
    const end = new Date().getFullYear();
    return Array.from(
      { length: end - start + 1 },
      (_, i) => (start + i).toString()
    );
  }, [joinDate]);

  const monthStartDate = useMemo(() => {
    return startOfMonth(new Date(Number(selectedYear), Number(selectedMonth), 1));
  }, [selectedYear, selectedMonth]);

  const monthEndDate = useMemo(() => {
    return endOfMonth(new Date(Number(selectedYear), Number(selectedMonth), 1));
  }, [selectedYear, selectedMonth]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const attendanceDate = new Date(a.date);
      
      if (
        attendanceDate.getMonth() !== Number(selectedMonth) ||
        attendanceDate.getFullYear() !== Number(selectedYear)
      ) {
        return false;
      }

      if (reportType === "employee" && a.empId !== selectedEmployee) {
        return false;
      }

      return true;
    });
  }, [attendance, selectedEmployee, selectedMonth, selectedYear, reportType]);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStartDate, end: monthEndDate });
  }, [monthStartDate, monthEndDate]);

  const reportData = useMemo(() => {
    const data: ReportData = {
      totalWorkingDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      approvedLeaves: 0,
      holidays: 0,
      weekendDays: 0,
      attendanceRate: 0,
      totalWorkHours: 0,
      averageWorkHours: 0,
    };

    if (reportType === "organization") {
      const employeeReports = employees.map(emp => {
        const empAttendance = attendance.filter(a => 
          a.empId === emp.id && 
          new Date(a.date) >= monthStartDate && 
          new Date(a.date) <= monthEndDate
        );
        
        const present = empAttendance.filter(a => a.status === "Present").length;
        const HalfDay = empAttendance.filter(a => a.status === "HalfDay").length;
        const total = empAttendance.length;
        
        return {
          present,
          HalfDay,
          total,
          rate: total > 0 ? (present + HalfDay) / total : 0
        };
      });

      const totalPresent = employeeReports.reduce((sum, emp) => sum + emp.present, 0);
      const totalLate = employeeReports.reduce((sum, emp) => sum + emp.HalfDay, 0);
      const totalDays = employeeReports.reduce((sum, emp) => sum + emp.total, 0);
      
      data.presentDays = totalPresent;
      data.lateDays = totalLate;
      data.totalWorkingDays = totalDays;
      data.absentDays = totalDays - totalPresent - totalLate;
      data.attendanceRate = totalDays > 0 ? Math.round(((totalPresent + totalLate) / totalDays) * 100) : 0;
      
      const monthLeaves = leaves.filter(leave => {
        if (!leave.startDate || !leave.endDate) return false;
        const start = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        const end = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
        return (
          (start >= monthStartDate && start <= monthEndDate) ||
          (end >= monthStartDate && end <= monthEndDate) ||
          (start <= monthStartDate && end >= monthEndDate)
        );
      });
      data.approvedLeaves = monthLeaves.filter(l => l.status === "approved").length;
      
    } else {
      const present = filteredAttendance.filter(a => a.status === "Present").length;
      const HalfDay = filteredAttendance.filter(a => a.status === "HalfDay").length;
      const total = filteredAttendance.length;
      
      data.presentDays = present;
      data.lateDays = HalfDay;
      data.totalWorkingDays = total;
      data.absentDays = total - present - HalfDay;
      data.attendanceRate = total > 0 ? Math.round(((present + HalfDay) / total) * 100) : 0;
      
      const workHours = filteredAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
      data.totalWorkHours = parseFloat(workHours.toFixed(1));
      data.averageWorkHours = total > 0 ? parseFloat((workHours / total).toFixed(1)) : 0;
      
      const employeeLeaves = leaves.filter(l => 
        l.employeeId === selectedEmployee && 
        l.status === "approved"
      ).filter(leave => {
        if (!leave.startDate || !leave.endDate) return false;
        const start = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        const end = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
        return (
          (start >= monthStartDate && start <= monthEndDate) ||
          (end >= monthStartDate && end <= monthEndDate) ||
          (start <= monthStartDate && end >= monthEndDate)
        );
      });
      data.approvedLeaves = employeeLeaves.length;
    }

    data.weekendDays = daysInMonth.filter(day => isWeekend(day)).length;
    
    const monthHolidays = holidays.filter(
      (h) => h.startDate <= monthEndDate && h.endDate >= monthStartDate
    );
    const holidayDaysInMonth = daysInMonth.filter((day) =>
      monthHolidays.some((h) => day >= h.startDate && day <= h.endDate)
    ).length;
    data.holidays = holidayDaysInMonth;

    return data;
  }, [filteredAttendance, employees, attendance, leaves, holidays, daysInMonth, reportType, selectedEmployee, monthStartDate, monthEndDate]);

  const detailedReport = useMemo(() => {
    if (reportType === "employee" && selectedEmployee) {
      return daysInMonth.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const attendanceRecord = attendance.find(a => 
          a.empId === selectedEmployee && a.date === dayStr
        );
        
        const holiday = holidays.find(
          (h) => dayStr >= format(h.startDate, "yyyy-MM-dd") && dayStr <= format(h.endDate, "yyyy-MM-dd")
        );
        
        const onLeave = leaves.find(l => 
          l.employeeId === selectedEmployee && 
          l.status === "approved" &&
          l.startDate && l.endDate
        );
        
        let status = "Absent";
        if (holiday) status = "Holiday";
        else if (isWeekend(day)) status = "Weekend";
        else if (onLeave) {
          const start = onLeave.startDate.toDate ? onLeave.startDate.toDate() : new Date(onLeave.startDate);
          const end = onLeave.endDate.toDate ? onLeave.endDate.toDate() : new Date(onLeave.endDate);
          if (day >= start && day <= end) status = "On Leave";
        }
        else if (attendanceRecord) status = attendanceRecord.status;

        return {
          date: format(day, "yyyy-MM-dd"),
          day: format(day, "EEE"),
          checkIn: attendanceRecord?.checkIn || "-",
          checkOut: attendanceRecord?.checkOut || "-",
          workHours: attendanceRecord?.workHours || "-",
          totalHours: attendanceRecord?.totalHours || 0,
          status,
          holidayName: holiday?.title,
          leaveType: onLeave?.leaveType,
        };
      });
    }
    return [];
  }, [daysInMonth, attendance, holidays, leaves, reportType, selectedEmployee]);

  const handleGenerateReport = () => {
    if (reportType === "employee" && !selectedEmployee) {
      toast({ 
        title: "Select employee", 
        description: "Please select an employee to generate report",
        variant: "destructive" 
      });
      return;
    }
    setReportGenerated(true);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Attendance Report", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    
    if (reportType === "employee" && selectedEmp) {
      doc.text(`Employee: ${selectedEmp.firstName} ${selectedEmp.lastName}`, 20, 45);
      doc.text(`Employee ID: ${selectedEmp.empId || "N/A"}`, 20, 55);
    }
    
    doc.text(`Period: ${months[Number(selectedMonth)]} ${selectedYear}`, 20, 65);
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, 20, 75);
    
    autoTable(doc, {
      startY: 85,
      head: [['Metric', 'Value']],
      body: [
        ['Total Working Days', reportData.totalWorkingDays.toString()],
        ['Present Days', reportData.presentDays.toString()],
        ['Absent Days', reportData.absentDays.toString()],
        ['HalfDay Days', reportData.lateDays.toString()],
        ['Approved Leaves', reportData.approvedLeaves.toString()],
        ['Holidays', reportData.holidays.toString()],
        ['Weekend Days', reportData.weekendDays.toString()],
        ['Attendance Rate', `${reportData.attendanceRate}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    if (reportType === "employee" && detailedReport.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Daily Attendance Details", 20, 20);
      
      autoTable(doc, {
        startY: 30,
        head: [['Date', 'Day', 'Check In', 'Check Out', 'Work Hours', 'Status']],
        body: detailedReport.map(record => [
          record.date,
          record.day,
          record.checkIn,
          record.checkOut,
          record.workHours,
          record.status,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
    }
    
    doc.save(`attendance-report-${reportType}-${selectedYear}-${months[Number(selectedMonth)]}.pdf`);
    
    toast({
      title: "PDF downloaded",
      description: "Report has been downloaded as PDF",
    });
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "Attendance Report\n";
    
    if (reportType === "employee" && selectedEmp) {
      csvContent += `Employee:,${selectedEmp.firstName} ${selectedEmp.lastName}\n`;
      csvContent += `Employee ID:,${selectedEmp.empId || "N/A"}\n`;
    }
    
    csvContent += `Period:,${months[Number(selectedMonth)]} ${selectedYear}\n`;
    csvContent += `Generated on:,${format(new Date(), "PPP")}\n\n`;
    
    csvContent += "Summary\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Working Days,${reportData.totalWorkingDays}\n`;
    csvContent += `Present Days,${reportData.presentDays}\n`;
    csvContent += `Absent Days,${reportData.absentDays}\n`;
    csvContent += `HalfDay Days,${reportData.lateDays}\n`;
    csvContent += `Approved Leaves,${reportData.approvedLeaves}\n`;
    csvContent += `Holidays,${reportData.holidays}\n`;
    csvContent += `Weekend Days,${reportData.weekendDays}\n`;
    csvContent += `Attendance Rate,${reportData.attendanceRate}%\n\n`;
    
    if (reportType === "employee" && detailedReport.length > 0) {
      csvContent += "Daily Attendance\n";
      csvContent += "Date,Day,Check In,Check Out,Work Hours,Status,Holiday,Leave Type\n";
      
      detailedReport.forEach(record => {
        csvContent += `${record.date},${record.day},${record.checkIn},${record.checkOut},${record.workHours},${record.status},${record.holidayName || ""},${record.leaveType || ""}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance-report-${reportType}-${selectedYear}-${months[Number(selectedMonth)]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV downloaded",
      description: "Report has been downloaded as CSV",
    });
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const summaryData = [
      ["Attendance Report"],
      reportType === "employee" && selectedEmp ? ["Employee:", `${selectedEmp.firstName} ${selectedEmp.lastName}`] : [],
      reportType === "employee" && selectedEmp ? ["Employee ID:", selectedEmp.empId || "N/A"] : [],
      ["Period:", `${months[Number(selectedMonth)]} ${selectedYear}`],
      ["Generated on:", format(new Date(), "PPP")],
      [],
      ["Summary"],
      ["Metric", "Value"],
      ["Total Working Days", reportData.totalWorkingDays],
      ["Present Days", reportData.presentDays],
      ["Absent Days", reportData.absentDays],
      ["HalfDayDays", reportData.lateDays],
      ["Approved Leaves", reportData.approvedLeaves],
      ["Holidays", reportData.holidays],
      ["Weekend Days", reportData.weekendDays],
      ["Attendance Rate", `${reportData.attendanceRate}%`],
    ].filter(row => row.length > 0);
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    
    if (reportType === "employee" && detailedReport.length > 0) {
      const detailedData = [
        ["Daily Attendance"],
        ["Date", "Day", "Check In", "Check Out", "Work Hours", "Total Hours", "Status", "Holiday", "Leave Type"],
        ...detailedReport.map(record => [
          record.date,
          record.day,
          record.checkIn,
          record.checkOut,
          record.workHours,
          record.totalHours,
          record.status,
          record.holidayName || "",
          record.leaveType || "",
        ])
      ];
      
      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, "Daily Attendance");
    }
    
    XLSX.writeFile(workbook, `attendance-report-${reportType}-${selectedYear}-${months[Number(selectedMonth)]}.xlsx`);
    
    toast({
      title: "Excel downloaded",
      description: "Report has been downloaded as Excel file",
    });
  };

  const handleDownload = (format: string) => {
    if (format === "pdf") downloadPDF();
    else if (format === "excel") downloadExcel();
    else if (format === "csv") downloadCSV();
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <DashboardLayout title="Reports" subtitle="Generate attendance reports">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Generate Report
                  </CardTitle>
                  <CardDescription>Configure and generate attendance reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportType === "employee" && (
                    <div className="space-y-2">
                      <Label>Select Employee</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateReport} 
                    className="w-full" 
                    variant="default"
                    disabled={isLoading || (reportType === "employee" && !selectedEmployee)}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="ml-2">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Report Preview
                    {reportGenerated && (
                      <Badge className="ml-2">
                        {months[Number(selectedMonth)]} {selectedYear}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportGenerated ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{reportData.totalWorkingDays}</div>
                          <div className="text-xs text-muted-foreground">Working Days</div>
                        </div>
                        <div className="bg-black rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{reportData.presentDays}</div>
                          <div className="text-xs text-muted-foreground">Present Days</div>
                        </div>
                        <div className="bg-black rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{reportData.absentDays}</div>
                          <div className="text-xs text-muted-foreground">Absent Days</div>
                        </div>
                        <div className="bg-black rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{reportData.lateDays}</div>
                          <div className="text-xs text-muted-foreground">HalfDay Days</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/60 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">{reportData.approvedLeaves}</div>
                            <div className="text-xs text-muted-foreground">Approved Leaves</div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/60 flex items-center justify-center">
                            <Palmtree className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">{reportData.holidays}</div>
                            <div className="text-xs text-muted-foreground">Holidays</div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/60 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">{reportData.weekendDays}</div>
                            <div className="text-xs text-muted-foreground">Weekend Days</div>
                          </div>
                        </div>
                      </div>

                      {reportType === "employee" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-lg p-4">
                            <div className="text-lg font-semibold">{reportData.totalWorkHours}h</div>
                            <div className="text-xs text-muted-foreground">Total Work Hours</div>
                          </div>
                          <div className="border rounded-lg p-4">
                            <div className="text-lg font-semibold">{reportData.averageWorkHours}h</div>
                            <div className="text-xs text-muted-foreground">Average Daily Hours</div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Overall Attendance Rate</span>
                          <span className="font-medium">{reportData.attendanceRate}%</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${reportData.attendanceRate}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium mb-3 block">Download Report</Label>
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => handleDownload("pdf")} className="flex-1 min-w-[120px]">
                            <File className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                          <Button onClick={() => handleDownload("excel")} className="flex-1 min-w-[120px]">
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Excel
                          </Button>
                          <Button onClick={() => handleDownload("csv")} className="flex-1 min-w-[120px]">
                            <FileText className="h-4 w-4 mr-2" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground">No Report Generated</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure the options and click "Generate Report" to preview
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}