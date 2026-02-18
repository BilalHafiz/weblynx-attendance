// import { useState, useEffect } from "react"; 
// import { useNavigate } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { useToast } from "@/hooks/use-toast";
// import { Clock, LogIn, LogOut, Calendar, CheckCircle2, XCircle, AlertCircle, Download, User, CalendarDays, PartyPopper } from "lucide-react";
// import { format } from "date-fns";
// import { doc, getDoc, query, where, getDocs, collection, onSnapshot } from "firebase/firestore";
// import { db } from "../lib/firebase.ts";

// const months = [
//   { value: "01", label: "January" },
//   { value: "02", label: "February" },
//   { value: "03", label: "March" },
//   { value: "04", label: "April" },
//   { value: "05", label: "May" },
//   { value: "06", label: "June" },
//   { value: "07", label: "July" },
//   { value: "08", label: "August" },
//   { value: "09", label: "September" },
//   { value: "10", label: "October" },
//   { value: "11", label: "November" },
//   { value: "12", label: "December" },
// ];

// const years = ["2024", "2025", "2026"];

// interface AttendanceRecord {
//   date: string;
//   day: string;
//   status: "present" | "absent" | "leave" | "holiday" | "weekend";
//   checkIn: string | null;
//   checkOut: string | null;
// }

// interface TodayStatus {
//   date: string;
//   status: "not-marked" | "checked-in" | "checked-out" | "present";
//   checkInTime: string | null;
//   checkOutTime: string | null;
// }

// export default function EmployeeDashboard() {
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   const [employee, setEmployee] = useState<any>(null); 
//   const [attendance, setAttendance] = useState<any[]>([]); 
//   const [todayStatus, setTodayStatus] = useState<TodayStatus>({
//     date: format(new Date(), "yyyy-MM-dd"),
//     status: "not-marked",
//     checkInTime: null,
//     checkOutTime: null,
//   });
//   const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "MM"));
//   const [selectedYear, setSelectedYear] = useState(format(new Date(), "yyyy"));
//   const [userName, setUserName] = useState("Employee");

//   const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
//   const [summary, setSummary] = useState({
//     present: 0,
//     absent: 0,
//     leaves: 0,
//     holidays: 0,
//   });

//   const [statusDisplay, setStatusDisplay] = useState({
//     bg: "bg-muted",
//     color: "text-muted-foreground",
//     label: "Not marked",
//   });

//   const StatusIcon = ({ status }: { status: string }) => {
//     switch (status) {
//       case "checked-in":
//         return <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-success" />;
//       case "checked-out":
//         return <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-warning" />;
//       case "present":
//         return <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-success" />;
//       default:
//         return <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-muted" />;
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "present":
//         return <Badge className="bg-green-500 text-white">Present</Badge>;
//       case "absent":
//         return <Badge className="bg-red-500 text-white">Absent</Badge>;
//       case "leave":
//         return <Badge className="bg-yellow-500 text-white">Leave</Badge>;
//       case "holiday":
//         return <Badge className="bg-blue-500 text-white">Holiday</Badge>;
//       case "weekend":
//         return <Badge className="bg-gray-500 text-white">Weekend</Badge>;
//       default:
//         return <Badge className="bg-gray-300 text-white">Unknown</Badge>;
//     }
//   };

//   useEffect(() => {
//     switch (todayStatus.status) {
//       case "checked-in":
//         setStatusDisplay({ bg: "bg-success/10", color: "text-success", label: "Checked In" });
//         break;
//       case "checked-out":
//         setStatusDisplay({ bg: "bg-warning/10", color: "text-warning", label: "Checked Out" });
//         break;
//       case "present":
//         setStatusDisplay({ bg: "bg-success/10", color: "text-success", label: "Present" });
//         break;
//       default:
//         setStatusDisplay({ bg: "bg-muted", color: "text-muted-foreground", label: "Not marked" });
//     }
//   }, [todayStatus.status]);

//   useEffect(() => {
//     const storedRole = localStorage.getItem("userRole");

//     if (!storedRole) {
//       navigate("/", { replace: true });
//       return;
//     }

//     if (storedRole === "admin") {
//       navigate("/index", { replace: true });
//       return;
//     }
//   }, [navigate]);

//   useEffect(() => {
//     const uid = localStorage.getItem("uid");
//     if (!uid) return;

//     const loadUser = async () => {
//       const userSnap = await getDoc(doc(db, "users", uid));
//       if (userSnap.exists()) {
//         setEmployee(userSnap.data());
//       }
//     };

//     loadUser();
//   }, []);

//   useEffect(() => {
//     if (!employee?.employeeId) return;

//     const loadAttendance = () => {
//       const q = query(
//         collection(db, "attendance"),
//         where("empId", "==", employee.employeeId)
//       );

//       // Real-time listener for employee's attendance
//       const unsubscribe = onSnapshot(q, (snap) => {
//         const records = snap.docs.map(d => d.data());
//         setAttendance(records);
//       });

//       return () => unsubscribe();
//     };

//     loadAttendance();
//   }, [employee]);

//   const handleLogout = () => {
//     localStorage.removeItem("userName");
//     localStorage.removeItem("userRole");
//     localStorage.removeItem("todayStatus");

//     navigate("/", { replace: true });
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
//         <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2 sm:gap-3">
//             <div>
//               <h1 className="font-semibold text-foreground text-sm sm:text-base">webLynx</h1>
//               <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Employee Dashboard</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2 sm:gap-4">
//             <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
//               <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
//               <span className="hidden sm:inline">Logout</span>
//             </Button>
//           </div>
//         </div>
//       </header>

//       <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
//         {/* Today's Status Card */}
//         <Card className="shadow-card">
//           <CardHeader className="pb-3 sm:pb-4">
//             <CardTitle className="text-base sm:text-lg flex items-center gap-2">
//               <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
//               Today's Status
//             </CardTitle>
//             <CardDescription className="text-xs sm:text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className={`rounded-xl p-3 sm:p-4 ${statusDisplay.bg} space-y-2 sm:space-y-3`}>
//               <div className="flex items-center gap-2 sm:gap-3">
//                 <StatusIcon status={todayStatus.status} />
//                 <div>
//                   <p className={`font-semibold text-base sm:text-lg ${statusDisplay.color}`}>{statusDisplay.label}</p>
//                   <p className="text-xs sm:text-sm text-muted-foreground">Current Status</p>
//                 </div>
//               </div>
//               <div>
//                 <p className="text-[10px] sm:text-xs text-muted-foreground">Check-Out Time</p>
//                 <p className="font-medium text-foreground text-sm sm:text-base">{todayStatus.checkOutTime || "--:--"}</p>
//               </div>
//             </div>
//             <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
//               Attendance is marked by Admin only
//             </p>
//           </CardContent>
//         </Card>

//         {/* Monthly Attendance Report */}
//         <Card className="shadow-card">
//           <CardHeader className="pb-3 sm:pb-6">
//             <div className="flex flex-col gap-3 sm:gap-4">
//               <CardTitle className="text-base sm:text-lg flex items-center gap-2">
//                 <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
//                 Monthly Attendance Report
//               </CardTitle>
//               <CardDescription className="text-xs sm:text-sm">View your attendance history (read-only)</CardDescription>
//             </div>
//             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//               <Select value={selectedMonth} onValueChange={setSelectedMonth}>
//                 <SelectTrigger className="w-[110px] sm:w-[130px] h-8 sm:h-10 text-xs sm:text-sm">
//                   <SelectValue placeholder="Month" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {months.map((month) => (
//                     <SelectItem key={month.value} value={month.value}>
//                       {month.label}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               <Select value={selectedYear} onValueChange={setSelectedYear}>
//                 <SelectTrigger className="w-[80px] sm:w-[100px] h-8 sm:h-10 text-xs sm:text-sm">
//                   <SelectValue placeholder="Year" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {years.map((year) => (
//                     <SelectItem key={year} value={year}>
//                       {year}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//               <Button variant="outline" size="sm" className="h-8 sm:h-10 text-xs sm:text-sm">
//                 <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
//                 <span className="hidden sm:inline">Download</span>
//                 <span className="sm:hidden">PDF</span>
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent className="px-2 sm:px-6">
//             <div className="rounded-lg border border-border overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow className="bg-muted/50">
//                     <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
//                     <TableHead className="font-semibold text-xs sm:text-sm hidden sm:table-cell">Day</TableHead>
//                     <TableHead className="font-semibold text-xs sm:text-sm">Status</TableHead>
//                     <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Check-In</TableHead>
//                     <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Check-Out</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {monthlyAttendance.slice(0, 15).map((record) => (
//                     <TableRow key={record.date} className="hover:bg-muted/30">
//                       <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
//                         {format(new Date(record.date), "MMM d")}
//                       </TableCell>
//                       <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{record.day}</TableCell>
//                       <TableCell>{getStatusBadge(record.status)}</TableCell>
//                       <TableCell className="text-muted-foreground text-xs sm:text-sm">{record.checkIn || "—"}</TableCell>
//                       <TableCell className="text-muted-foreground text-xs sm:text-sm">{record.checkOut || "—"}</TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//             <p className="text-xs text-muted-foreground mt-3 text-center">
//               Showing first 15 records • Full report available for download
//             </p>
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   );
// }