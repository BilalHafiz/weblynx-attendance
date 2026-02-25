import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building,
  Clock,
  Home,
  Sun,
  CalendarDays,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil
} from "lucide-react";
import { db } from "../lib/firebase.ts";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
  parseISO,
  isAfter,
  isToday,
  addDays,
  isWithinInterval,
  startOfDay,
  endOfDay
} from "date-fns";

const statusStyles = {
  Present: "bg-green-100 text-green-800 border-green-200",
  HalfDay: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "On Leave": "bg-blue-100 text-blue-800 border-blue-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  Holiday: "bg-purple-100 text-purple-800 border-purple-200",
  Weekend: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Checked-in": "bg-orange-100 text-orange-800 border-orange-200",
  "Upcoming": "bg-gray-100 text-gray-800 border-gray-200",
  default: "bg-gray-100 text-gray-800 border-gray-200",
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(format(new Date(), "yyyy-MM"));
  const [isLoading, setIsLoading] = useState(true);
  const [monthSummary, setMonthSummary] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, [id, monthFilter]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      const docRef = doc(db, "employees", id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setEmployee({ id: docSnap.id, ...docSnap.data() });

      const q = query(collection(db, "attendance"), where("empId", "==", id));
      const querySnapshot = await getDocs(q);
      const attendanceRecords: any[] = [];
      querySnapshot.forEach(doc => attendanceRecords.push({ id: doc.id, ...doc.data() }));
      setAttendance(attendanceRecords);

      const leaveQuery = query(
        collection(db, "employee_leaves"),
        where("employeeId", "==", id),
        where("status", "==", "approved")
      );
      const leaveSnapshot = await getDocs(leaveQuery);
      const leaveList: any[] = [];
      leaveSnapshot.forEach(doc => leaveList.push({ id: doc.id, ...doc.data() }));
      setLeaveRecords(leaveList);

      const holidaySnap = await getDocs(collection(db, "holidays"));
      const toDate = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : null);
      const holidayList: any[] = [];
      holidaySnap.forEach((docSnap) => {
        const data = docSnap.data();
        let startDate = toDate(data.startDate);
        let endDate = toDate(data.endDate);
        if (!startDate || !endDate) {
          const single = toDate(data.date) || new Date();
          startDate = endDate = single;
        }
        holidayList.push({
          id: docSnap.id,
          ...data,
          startDate,
          endDate,
          title: data.title || "Holiday"
        });
      });
      setHolidays(holidayList);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employee && attendance.length >= 0 && holidays.length >= 0 && leaveRecords.length >= 0) {
      calculateMonthSummary();
    }
  }, [attendance, monthFilter, leaveRecords, holidays, employee]);

  const calculateMonthSummary = () => {
    const [year, month] = monthFilter.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const today = new Date();
    const endDateToUse = isAfter(endDate, today) ? today : endDate;

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDateToUse });

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;
    let upcomingCount = 0;
    let totalWorkHours = 0;

    daysInMonth.forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");

      if (isAfter(day, today) && !isToday(day)) {
        upcomingCount++;
        return;
      }

      if (isWeekend(day)) {
        weekendCount++;
        return;
      }

      const isHoliday = holidays.some((h) =>
        isWithinInterval(day, { start: startOfDay(h.startDate), end: endOfDay(h.endDate) })
      );
      if (isHoliday) {
        holidayCount++;
        return;
      }

      const isOnLeave = leaveRecords.some(leave => {
        if (!leave.startDate || !leave.endDate) return false;
        const startDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        const endDate = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
        return (isSameDay(day, startDate) || isSameDay(day, endDate) || (day > startDate && day < endDate));
      });
      if (isOnLeave) {
        leaveCount++;
        return;
      }

      const dayAttendance = attendance.find(record => record.date === dayStr);
      if (dayAttendance) {
        if (dayAttendance.status === "Present") {
          presentCount++;
          if (dayAttendance.totalHours) totalWorkHours += dayAttendance.totalHours;
        } else if (dayAttendance.status === "HalfDay") {
          lateCount++;
          if (dayAttendance.totalHours) totalWorkHours += dayAttendance.totalHours;
        } else if (dayAttendance.status === "Checked-in") {
          absentCount++;
        }
      } else {
        absentCount++;
      }
    });

    const workingDays = daysInMonth.filter(day => {
      const isWeekendDay = isWeekend(day);
      const isHolidayDay = holidays.some((h) =>
        isWithinInterval(day, { start: startOfDay(h.startDate), end: endOfDay(h.endDate) })
      );
      const isFutureDay = isAfter(day, today) && !isToday(day);
      return !isWeekendDay && !isHolidayDay && !isFutureDay;
    }).length;

    const totalDays = daysInMonth.length;

    const attendanceRate = workingDays > 0 ? ((presentCount + lateCount) / workingDays) * 100 : 0;

    setMonthSummary({
      presentCount,
      lateCount,
      absentCount,
      leaveCount,
      holidayCount,
      weekendCount,
      upcomingCount,
      totalDays,
      workingDays,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
      attendanceRate: parseFloat(attendanceRate.toFixed(1)),
    });
  };

  const generateMonthlyRecord = () => {
    const [year, month] = monthFilter.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const today = new Date();
    const endDateToUse = isAfter(endDate, today) ? today : endDate;
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDateToUse });

    return daysInMonth.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayName = format(day, "EEE");
      const isFutureDate = isAfter(day, today) && !isToday(day);

      if (isFutureDate) return { date: dayStr, day: dayName, checkIn: "-", checkOut: "-", workHours: "-", status: "Upcoming", isFuture: true, type: "upcoming" };
      if (isWeekend(day)) return { date: dayStr, day: dayName, checkIn: "-", checkOut: "-", workHours: "-", status: "Weekend", isWeekend: true, type: "weekend" };

      const holiday = holidays.find((h) =>
        isWithinInterval(day, { start: startOfDay(h.startDate), end: endOfDay(h.endDate) })
      );
      if (holiday) return { date: dayStr, day: dayName, checkIn: "-", checkOut: "-", workHours: "-", status: "Holiday", holidayName: holiday.title, type: "holiday" };

      const onLeave = leaveRecords.find(leave => {
        if (!leave.startDate || !leave.endDate) return false;
        const startDate = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
        const endDate = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
        return (isSameDay(day, startDate) || isSameDay(day, endDate) || (day > startDate && day < endDate));
      });
      if (onLeave) return { date: dayStr, day: dayName, checkIn: "-", checkOut: "-", workHours: "-", status: "On Leave", leaveType: onLeave.leaveType, note: onLeave.note, type: "leave" };

      const dayAttendance = attendance.find(record => record.date === dayStr);
      if (dayAttendance) return { date: dayStr, day: dayName, checkIn: dayAttendance.checkIn || "-", checkOut: dayAttendance.checkOut || "-", workHours: dayAttendance.workHours || (dayAttendance.checkIn && !dayAttendance.checkOut ? "Pending" : "-"), status: dayAttendance.status || "Absent", totalHours: dayAttendance.totalHours, type: "attendance" };

      return { date: dayStr, day: dayName, checkIn: "-", checkOut: "-", workHours: "-", status: "Absent", type: "absent" };
    });
  };

  if (!employee) return (
    <DashboardLayout title="Employee Profile" subtitle="Loading...">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-muted-foreground">Loading employee data...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const monthlyRecords = generateMonthlyRecord();
  const filteredRecords = monthlyRecords.filter((record) => {
    const matchesSearch = record.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.holidayName && record.holidayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (record.leaveType && record.leaveType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const months = Array.from({ length: currentMonth + 1 }, (_, i) => {
    const date = new Date(currentYear, i, 1);
    const monthValue = format(date, "yyyy-MM");
    const monthLabel = format(date, "MMMM yyyy");
    const isCurrentMonth = i === currentMonth;
    return { value: monthValue, label: isCurrentMonth ? `${monthLabel} (Current)` : monthLabel };
  }).reverse();

  return (
    <DashboardLayout title="Employee Profile" subtitle={`Viewing ${employee.firstName} ${employee.lastName}'s complete record`}>
      <Button variant="ghost" asChild className="mb-6 gap-2">
        <Link to="/employees">
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
      </Button>

      {/* Top section: user info (avatar, name, status, contact) aligned left */}
      <Card className="mb-6 shadow-card animate-slide-up">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
              {employee.avatar ? (
                <AvatarImage src={employee.avatar} />
              ) : (
                <AvatarFallback className="text-lg sm:text-xl">
                  {employee.firstName?.charAt(0)}
                  {employee.lastName?.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col gap-2 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {employee.firstName} {employee.lastName}
              </h2>
              <Badge variant="outline" className="w-fit bg-success/10 text-success border-success/20">
                {employee.status || "Active"}
              </Badge>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-2">
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground truncate">{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground">{employee.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other information: summary cards and monthly record */}
      <div className="space-y-6">
          {monthSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Present</p>
                      <p className="text-2xl font-bold text-green-600">{monthSummary.presentCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">HalfDay</p>
                      <p className="text-2xl font-bold text-yellow-600">{monthSummary.lateCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{monthSummary.absentCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-100">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Leave</p>
                      <p className="text-2xl font-bold text-blue-600">{monthSummary.leaveCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Home className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Holidays</p>
                      <p className="text-2xl font-bold text-purple-600">{monthSummary.holidayCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Sun className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Weekends</p>
                      <p className="text-2xl font-bold text-indigo-600">{monthSummary.weekendCount}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-100">
                      <CalendarDays className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Work Hours</p>
                      <p className="text-2xl font-bold text-gray-700">{monthSummary.totalWorkHours}h</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <BarChart3 className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-2xl font-bold text-green-600">{monthSummary.attendanceRate}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div>
                    <CardTitle>Complete Monthly Record</CardTitle>
                    <CardDescription>
                      {format(new Date(monthFilter + "-01"), "MMMM yyyy")} •
                      Showing {monthSummary?.totalDays || 0} days (up to today) •
                      Working Days: {monthSummary?.workingDays || 0}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4 justify-start sm:justify-end">
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="HalfDay">HalfDay</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                      <SelectItem value="Weekend">Weekend</SelectItem>
                      <SelectItem value="Checked-in">Checked-in</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by date, or leave type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 p-3 rounded-lg border border-white/10" style={{ backgroundColor: "#1a1a1a" }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-xs">Present (&ge;9 hours)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span className="text-xs">HalfDay (&lt;9 hours)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-xs">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-xs">On Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span className="text-xs">Checked-in (Pending)</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-2 text-muted-foreground">Loading records...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Work Hours</TableHead>
                        <TableHead>Status/Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow
                          key={record.date}
                          className={record.isFuture ? "bg-gray-50" : ""}
                        >
                          <TableCell className="font-medium">
                            {record.date}
                            {record.isFuture && (
                              <span className="ml-2 text-xs text-gray-500">(Future)</span>
                            )}
                          </TableCell>
                          <TableCell>{record.day}</TableCell>
                          <TableCell>{record.checkIn}</TableCell>
                          <TableCell>{record.checkOut}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{record.workHours}</span>
                              {record.totalHours && (
                                <span className="text-xs text-gray-500">
                                  {record.totalHours.toFixed(1)} hours
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={statusStyles[record.status] || statusStyles.default}
                              >
                                {record.status}
                              </Badge>

                              {record.leaveType && (
                                <span className="text-xs text-blue-600">
                                  {record.leaveType} Leave
                                  {record.note && ` - ${record.note}`}
                                </span>
                              )}

                              {record.status === "HalfDay" && record.totalHours && (
                                <span className="text-xs text-yellow-600">
                                  Worked: {record.totalHours.toFixed(1)}h (less than 9h)
                                </span>
                              )}

                              {record.status === "Checked-in" && (
                                <span className="text-xs text-orange-600">
                                  Pending check-out
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {filteredRecords.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No records found for the selected filters</p>
                      <p className="text-sm text-gray-500 mt-1">Try changing your search or filters</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeProfile;