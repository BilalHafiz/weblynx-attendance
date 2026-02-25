import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, Fingerprint, Clock, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { collection, doc, getDocs, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.ts";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface AttendanceRecord {
  empId: string;
  name: string;
  avatar?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  workHours?: string;
  totalHours?: number;
}

interface Holiday {
  id: string;
  startDate: Date;
  endDate: Date;
  title: string;
}

interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

const statusStyles: Record<string, string> = {
  Present: "bg-green-100 text-green-800 border-green-200",
  HalfDay: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  Leave: "bg-blue-100 text-blue-800 border-blue-200",
  Holiday: "bg-purple-100 text-purple-800 border-purple-200",
  "Checked-in": "bg-orange-100 text-orange-800 border-orange-200",
};

const calendarWhiteClassNames = {
  caption_label: "text-sm font-medium text-white",
  head_cell: "text-white rounded-md w-9 font-normal text-[0.8rem]",
  day: "h-9 w-9 p-0 font-normal text-white aria-selected:opacity-100 hover:bg-white/10 hover:text-white",
  day_selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
  day_today: "bg-accent text-white",
  day_outside: "day-outside text-white opacity-50 aria-selected:bg-accent/50 aria-selected:text-white aria-selected:opacity-30",
  day_disabled: "text-white opacity-50",
  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white border-white",
};

const Attendance = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [attendanceType, setAttendanceType] = useState<"in" | "out">("in");
  const [date, setDate] = useState(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [empSnap, holidaySnap, leaveSnap, attSnap] = await Promise.all([
        getDocs(collection(db, "employees")),
        getDocs(collection(db, "holidays")),
        getDocs(collection(db, "employee_leaves")),
        getDocs(collection(db, "attendance"))
      ]);

      const empList: Employee[] = empSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Employee, "id">),
      }));
      setEmployees(empList);

      const toDate = (v: unknown) => (v && typeof (v as { toDate?: () => Date }).toDate === "function" ? (v as { toDate: () => Date }).toDate() : null);
      const holidayList: Holiday[] = holidaySnap.docs.map((docSnap) => {
        const data = docSnap.data();
        let start = toDate(data.startDate);
        let end = toDate(data.endDate);
        if (!start || !end) {
          const single = toDate(data.date);
          const d = single || new Date();
          start = end = d;
        }
        return {
          id: docSnap.id,
          startDate: start,
          endDate: end,
          title: data.title || "Holiday",
        };
      });
      setHolidays(holidayList);

      const leaveList: LeaveRecord[] = leaveSnap.docs.map((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate ? format(data.startDate.toDate(), "yyyy-MM-dd") : "";
        const endDate = data.endDate?.toDate ? format(data.endDate.toDate(), "yyyy-MM-dd") : "";
        
        return {
          id: doc.id,
          employeeId: data.employeeId || "",
          startDate: startDate,
          endDate: endDate,
          status: data.status || "approved",
        };
      });
      setLeaveRecords(leaveList);

      const todayAttendanceRecords: AttendanceRecord[] = [];
      
      attSnap.forEach((doc) => {
        const data = doc.data();
        if (data.date === today) {
          todayAttendanceRecords.push({
            empId: data.empId || "",
            name: data.name || "",
            avatar: data.avatar || "",
            date: data.date || today,
            checkIn: data.checkIn || "",
            checkOut: data.checkOut || "",
            status: data.status || "Absent",
            workHours: data.workHours || "",
            totalHours: data.totalHours || 0,
          });
        }
      });

      const mergedAttendance: AttendanceRecord[] = empList.map((emp) => {
        const existingRecord = todayAttendanceRecords.find(record => record.empId === emp.id);
        
        if (existingRecord) {
          return existingRecord;
        }

        const isTodayHoliday = holidayList.some(
          (holiday) => today >= format(holiday.startDate, "yyyy-MM-dd") && today <= format(holiday.endDate, "yyyy-MM-dd")
        );

        const hasLeave = leaveList.some(leave => 
          leave.employeeId === emp.id && 
          leave.status === "approved" &&
          today >= leave.startDate && 
          today <= leave.endDate
        );

        let status = "Absent";
        if (isTodayHoliday) {
          status = "Holiday";
        } else if (hasLeave) {
          status = "Leave";
        }

        return {
          empId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          avatar: emp.avatar,
          date: today,
          checkIn: "",
          checkOut: "",
          status: status,
          workHours: "",
          totalHours: 0,
        };
      });

      setAttendance(mergedAttendance);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWorkHours = (checkIn: string, checkOut: string) => {
    try {
      if (!checkIn || !checkOut) {
        return { workHours: "-", totalHours: 0 };
      }

      const [inHour, inMinute] = checkIn.split(":").map(Number);
      const [outHour, outMinute] = checkOut.split(":").map(Number);
      
      if (isNaN(inHour) || isNaN(inMinute) || isNaN(outHour) || isNaN(outMinute)) {
        return { workHours: "Invalid", totalHours: 0 };
      }

      const totalMinutesIn = inHour * 60 + inMinute;
      const totalMinutesOut = outHour * 60 + outMinute;
      
      let diffMinutes = totalMinutesOut - totalMinutesIn;
      
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
      
      const totalHours = diffMinutes / 60;
      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);
      
      let workHours = "";
      if (minutes > 0) {
        workHours = `${hours}h ${minutes}m`;
      } else {
        workHours = `${hours}h`;
      }
      
      return { workHours, totalHours: parseFloat(totalHours.toFixed(2)) };
    } catch (error) {
      console.error("Error calculating work hours:", error);
      return { workHours: "Error", totalHours: 0 };
    }
  };

  const handleAttendance = async () => {
    if (!selectedEmp) {
      toast({ 
        title: "Select Employee", 
        description: "Please select an employee first",
        variant: "destructive" 
      });
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmp);
    if (!emp) {
      toast({ 
        title: "Error", 
        description: "Employee not found",
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const docId = `${selectedEmp}_${date}`;
      const attendanceRef = doc(db, "attendance", docId);
      
      let existingData: AttendanceRecord | null = null;
      try {
        const existingDoc = await getDoc(attendanceRef);
        if (existingDoc.exists()) {
          existingData = existingDoc.data() as AttendanceRecord;
        }
      } catch (error) {
        console.error("Error fetching existing attendance:", error);
      }

      const firestoreData: any = {
        empId: selectedEmp,
        name: `${emp.firstName} ${emp.lastName}`,
        date: date,
        updatedAt: new Date().toISOString(),
      };

      if (emp.avatar) {
        firestoreData.avatar = emp.avatar;
      }

      let status = "Absent";
      let workHours = "";
      let totalHours = 0;

      if (attendanceType === "in") {
        if (!time.match(/^\d{2}:\d{2}$/)) {
          toast({
            title: "Invalid Time",
            description: "Please enter time in HH:mm format",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        if (existingData?.checkIn && !existingData?.checkOut) {
          toast({
            title: "Already Checked In",
            description: "Employee is already checked in. Please check out first.",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        firestoreData.checkIn = time;
        firestoreData.checkOut = existingData?.checkOut || "";
        status = "Checked-in";
        
        toast({
          title: "Check-in Recorded",
          description: `${emp.firstName} checked in at ${time}`,
        });
      }
      
      if (attendanceType === "out") {
        if (!existingData?.checkIn) {
          toast({
            title: "Check-in Required",
            description: "Please check in first before checking out",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        if (!time.match(/^\d{2}:\d{2}$/)) {
          toast({
            title: "Invalid Time",
            description: "Please enter time in HH:mm format",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        const calculated = calculateWorkHours(existingData.checkIn, time);
        workHours = calculated.workHours;
        totalHours = calculated.totalHours;
        
        status = totalHours >= 9 ? "Present" : "HalfDay";
        
        firestoreData.checkIn = existingData.checkIn;
        firestoreData.checkOut = time;
        firestoreData.workHours = workHours;
        firestoreData.totalHours = totalHours;
        
        toast({
          title: "Check-out Recorded",
          description: `${emp.firstName} checked out at ${time}. Worked: ${workHours}`,
        });
      }

      firestoreData.status = status;

      console.log("Saving to Firestore:", firestoreData);
      await setDoc(attendanceRef, firestoreData);
      console.log("Saved successfully");

      const updatedRecord: AttendanceRecord = {
        empId: selectedEmp,
        name: `${emp.firstName} ${emp.lastName}`,
        avatar: emp.avatar,
        date: date,
        checkIn: firestoreData.checkIn || "",
        checkOut: firestoreData.checkOut || "",
        status: firestoreData.status,
        workHours: firestoreData.workHours || "",
        totalHours: firestoreData.totalHours || 0,
      };

      setAttendance(prev => {
        const index = prev.findIndex(a => a.empId === selectedEmp && a.date === date);
        
        if (index >= 0) {
          const newArray = [...prev];
          newArray[index] = updatedRecord;
          return newArray;
        } else {
          return [...prev, updatedRecord];
        }
      });

      setOpen(false);
      setSelectedEmp("");
      setAttendanceType("in");
      setDate(today);
      setTime(format(new Date(), "HH:mm"));

    } catch (error: any) {
      console.error("Error saving attendance:", error);
      
      let errorMessage = "Failed to save attendance";
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Check Firebase rules.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Network error. Check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = attendance.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.empId.includes(searchQuery);
    const matchStatus =
      statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <DashboardLayout title="Attendance" subtitle="Employee attendance tracking">
      <div className="bg-card rounded-xl shadow-card">
        <div className="p-4 border-b bg-muted/50">
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center p-2 bg-black rounded">
              <div className="text-lg font-bold text-green-600">
                {attendance.filter(a => a.status === "Present").length}
              </div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="text-center p-2 bg-black rounded">
              <div className="text-lg font-bold text-yellow-600">
                {attendance.filter(a => a.status === "HalfDay").length}
              </div>
              <div className="text-xs text-gray-600">HalfDay</div>
            </div>
            <div className="text-center p-2 bg-black rounded">
              <div className="text-lg font-bold text-red-600">
                {attendance.filter(a => a.status === "Absent").length}
              </div>
              <div className="text-xs text-gray-600">Absent</div>
            </div>
            <div className="text-center p-2 bg-black rounded">
              <div className="text-lg font-bold text-blue-600">
                {attendance.filter(a => a.status === "Leave").length}
              </div>
              <div className="text-xs text-gray-600">Leave</div>
            </div>
            <div className="text-center p-2 bg-black rounded">
              <div className="text-lg font-bold text-purple-600">
                {attendance.filter(a => a.status === "Holiday").length}
              </div>
              <div className="text-xs text-gray-600">Holiday</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b flex flex-wrap gap-3 justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Mark Attendance
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Attendance</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Select
                    value={selectedEmp}
                    onValueChange={setSelectedEmp}
                  >
                    <SelectTrigger className="border-white">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={attendanceType}
                    onValueChange={(v) =>
                      setAttendanceType(v as "in" | "out")
                    }
                  >
                    <SelectTrigger className="border-white">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Check In</SelectItem>
                      <SelectItem value="out">Check Out</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start border-white text-white hover:bg-white/10 hover:text-white"
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {date ? format(new Date(date), "dd/MM/yyyy") : "dd/mm/yyyy"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date ? new Date(date) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                setDate(format(d, "yyyy-MM-dd"));
                                setDateOpen(false);
                              }
                            }}
                            classNames={calendarWhiteClassNames}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full justify-start border-white text-white hover:bg-white/10 hover:text-white h-10 [&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    disabled={!selectedEmp || isSaving} 
                    onClick={handleAttendance}
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Attendance"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="HalfDay">HalfDay</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Leave">Leave</SelectItem>
                <SelectItem value="Holiday">Holiday</SelectItem>
                <SelectItem value="Checked-in">Checked-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-muted-foreground">Loading Attendance Data...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No attendance records found</p>
            <p className="text-sm text-gray-500 mt-1">Try changing your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map((r, index) => {
                  let displayWorkHours = r.workHours;
                  if (!displayWorkHours && r.checkIn && r.checkOut) {
                    const calculated = calculateWorkHours(r.checkIn, r.checkOut);
                    displayWorkHours = calculated.workHours;
                  }

                  return (
                    <TableRow key={`${r.empId}-${r.date}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="flex gap-3 items-center">
                        <Avatar>
                          {r.avatar ? (
                            <AvatarImage src={r.avatar} />
                          ) : (
                            <AvatarFallback>
                              {r.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium">{r.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.checkIn || "-"}</TableCell>
                      <TableCell>{r.checkOut || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {r.totalHours && r.totalHours > 0 && (
                            <span className="text-xs text-gray-500">
                              {r.totalHours.toFixed(1)} hours
                            </span>
                          )}
                          {r.checkIn && !r.checkOut && (
                            <span className="text-xs text-orange-600 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending check-out
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[r.status]}>
                          {r.status}
                          {r.status === "HalfDay" && r.totalHours && (
                            <span className="ml-1 text-xs">({r.totalHours.toFixed(1)}h)</span>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Attendance;