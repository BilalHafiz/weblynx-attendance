import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Users, UserCheck, UserX, Clock, Calendar, BarChart3, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase.ts";
import { format, startOfWeek, startOfMonth, eachDayOfInterval, isSameDay, subDays } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from "recharts";

const Index = () => {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
    lateToday: 0,
    checkedInToday: 0,
    avgWorkHours: 0,
    attendanceRate: 0,
    weeklyAttendance: [] as any[],
    attendanceStatus: {} as Record<string, number>,
    recentActivities: [] as any[]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      const [employeesSnap, attendanceSnap, leavesSnap] = await Promise.all([
        getDocs(collection(db, "employees")),
        getDocs(collection(db, "attendance")),
        getDocs(collection(db, "employee_leaves"))
      ]);

      const employees = employeesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const attendance = attendanceSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const leaves = leavesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const todayAttendance = attendance.filter((record: any) => record.date === todayStr);
      const presentToday = todayAttendance.filter((record: any) => record.status === "Present").length;
      const lateToday = todayAttendance.filter((record: any) => record.status === "HalfDay").length;
      const checkedInToday = todayAttendance.filter((record: any) => record.status === "Checked-in").length;

      const onLeaveToday = employees.filter(emp => {
        return leaves.some((leave: any) => {
          if (leave.employeeId !== emp.id) return false;

          let startDate: Date;
          let endDate: Date;

          if (leave.startDate && leave.startDate.toDate) {
            startDate = leave.startDate.toDate();
          } else if (leave.startDate) {
            startDate = new Date(leave.startDate);
          } else {
            return false;
          }

          if (leave.endDate && leave.endDate.toDate) {
            endDate = leave.endDate.toDate();
          } else if (leave.endDate) {
            endDate = new Date(leave.endDate);
          } else {
            return false;
          }

          return today >= startDate && today <= endDate;
        });
      }).length;

      const absentToday = Math.max(0, employees.length - presentToday - lateToday - onLeaveToday - checkedInToday);

      let totalHours = 0;
      let hoursCount = 0;

      todayAttendance.forEach((record: any) => {
        if (record.totalHours && typeof record.totalHours === 'number' && record.totalHours > 0) {
          totalHours += record.totalHours;
          hoursCount++;
        }
      });

      const avgWorkHoursToday = hoursCount > 0 ? totalHours / hoursCount : 0;

      const attendanceRate = employees.length > 0
        ? ((presentToday + lateToday) / employees.length) * 100
        : 0;

      const rangeStart =
        selectedPeriod === "month"
          ? startOfMonth(today)
          : startOfWeek(today, { weekStartsOn: 1 });

      const daysRange = eachDayOfInterval({
        start: rangeStart,
        end: today
      });

      const weeklyAttendance = daysRange.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");

        const dayAttendance = attendance.filter(
          (record: any) => record.date === dayStr
        );

        const present = dayAttendance.filter(
          (record: any) => record.status === "Present"
        ).length;

        const HalfDay = dayAttendance.filter(
          (record: any) => record.status === "HalfDay"
        ).length;

        const total = employees.length;

        return {
          date: format(day, selectedPeriod === "month" ? "dd MMM" : "EEE"),
          fullDate: dayStr,
          present,
          HalfDay,
          absent: Math.max(0, total - present - HalfDay),
          attendanceRate: total > 0
            ? ((present + HalfDay) / total) * 100
            : 0
        };
      });

      const attendanceStatus: Record<string, number> = {
        Present: presentToday,
        HalfDay: lateToday,
        Absent: absentToday,
        "On Leave": onLeaveToday,
        "Checked-in": checkedInToday
      };

      const recentActivities = generateRecentActivities(attendance, employees, leaves);

      setDashboardData({
        totalEmployees: employees.length,
        presentToday,
        onLeaveToday,
        absentToday,
        lateToday,
        checkedInToday,
        avgWorkHours: parseFloat(avgWorkHoursToday.toFixed(1)),
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        weeklyAttendance,
        attendanceStatus,
        recentActivities
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecentActivities = (attendance: any[], employees: any[], leaves: any[]) => {
    const today = new Date();
    const activities: any[] = [];

    const recentCheckins = attendance
      .filter((record: any) => record.checkIn && record.date)
      .map((record: any) => {
        const employee = employees.find((emp: any) => emp.id === record.empId);
        let recordDate = new Date(record.date);
        return {
          type: "checkin",
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee",
          time: record.checkIn || "N/A",
          date: record.date,
          status: record.status || "Checked-in",
          timestamp: recordDate.getTime()
        };
      });

    const recentLeaves = leaves
      .filter((leave: any) => leave.createdAt)
      .map((leave: any) => {
        const employee = employees.find((emp: any) => emp.id === leave.employeeId);
        let createdAt: Date;
        if (leave.createdAt.toDate) {
          createdAt = leave.createdAt.toDate();
        } else {
          createdAt = new Date(leave.createdAt);
        }
        let startDate = "";
        let endDate = "";

        if (leave.startDate) {
          startDate = leave.startDate.toDate
            ? format(leave.startDate.toDate(), "MMM dd")
            : format(new Date(leave.startDate), "MMM dd");
        }

        if (leave.endDate) {
          endDate = leave.endDate.toDate
            ? format(leave.endDate.toDate(), "MMM dd")
            : format(new Date(leave.endDate), "MMM dd");
        }

        return {
          type: "leave",
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee",
          leaveType: leave.leaveType || "Leave",
          period: startDate && endDate ? `${startDate} - ${endDate}` : "Date not specified",
          date: "Recently",
          timestamp: createdAt.getTime()
        };
      });

    const allActivities = [...recentCheckins, ...recentLeaves]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    return allActivities;
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 border-green-200';
      case 'HalfDay': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'On Leave': return 'bg-primary/20 text-primary border-primary/30';
      case 'Checked-in': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const CustomStatCard = ({
    title,
    value,
    change,
    changeType = "neutral",
    icon: Icon,
    iconColor,
    iconBg,
    isLoading = false
  }: {
    title: string;
    value: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: any;
    iconColor: string;
    iconBg: string;
    isLoading?: boolean;
  }) => {
    if (isLoading) {
      return (
        <div className="bg-card rounded-xl shadow p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-3 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="p-3 rounded-lg bg-gray-200">
              <div className="h-6 w-6"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-2 ${changeType === "positive" ? "text-green-600" :
                changeType === "negative" ? "text-red-600" :
                  "text-yellow-600"
                }`}>
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Real-time attendance and workforce overview"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <CustomStatCard
          title="Total Employees"
          value={dashboardData.totalEmployees.toString()}
          change={`${dashboardData.attendanceRate}% attendance rate`}
          changeType={dashboardData.attendanceRate >= 90 ? "positive" : dashboardData.attendanceRate >= 80 ? "neutral" : "negative"}
          icon={Users}
          iconColor="text-white"
          iconBg="bg-primary/60"
          isLoading={isLoading}
        />
        <CustomStatCard
          title="Present Today"
          value={dashboardData.presentToday.toString()}
          change={`${dashboardData.lateToday} HalfDay, ${dashboardData.checkedInToday} checked-in`}
          changeType="positive"
          icon={UserCheck}
          iconColor="text-white"
          iconBg="bg-primary/60"
          isLoading={isLoading}
        />
        <CustomStatCard
          title="Absent Today"
          value={dashboardData.absentToday.toString()}
          change={`${dashboardData.onLeaveToday} on leave`}
          changeType="negative"
          icon={UserX}
          iconColor="text-white"
          iconBg="bg-primary/60"
          isLoading={isLoading}
        />
        <CustomStatCard
          title="Work Hours Today"
          value={`${dashboardData.avgWorkHours}h`}
          change="Average per employee"
          changeType={dashboardData.avgWorkHours >= 8 ? "positive" : "neutral"}
          icon={Clock}
          iconColor="text-white"
          iconBg="bg-primary/60"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Weekly Attendance Trend</h3>
                <p className="text-sm text-muted-foreground">Last 7 days attendance overview</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPeriod("week")}
                  className={`px-3 py-1 text-sm rounded transition-colors ${selectedPeriod === "week" ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setSelectedPeriod("month")}
                  className={`px-3 py-1 text-sm rounded transition-colors ${selectedPeriod === "month" ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  Month
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dashboardData.weeklyAttendance}
                    margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(0, 0%, 20%)"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(0, 0%, 80%)", fontSize: 12 }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: "hsl(0, 0%, 80%)", fontSize: 12 }}
                    />

                    <Tooltip
                      formatter={(value: any) => [`${value}%`, "Attendance"]}
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 10%)",
                        borderRadius: "8px",
                        border: "1px solid hsl(0, 0%, 20%)",
                        color: "hsl(0, 0%, 100%)"
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="attendanceRate"
                      stroke="none"
                      fill="rgba(139, 0, 0, 0.15)"
                    />

                    <Line
                      type="monotone"
                      dataKey="attendanceRate"
                      stroke="hsl(0, 100%, 27%)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(0, 100%, 27%)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/60">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Attendance Status</h3>
              <p className="text-sm text-muted-foreground">Today's distribution</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-56">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                  {(() => {
                    const total = Object.values(dashboardData.attendanceStatus)
                      .reduce((a, b) => a + b, 0);

                    let cumulative = 0;

                    const colors: Record<string, string> = {
                      Present: "#16a34a",
                      HalfDay: "#ca8a04",
                      Absent: "#dc2626",
                      "On Leave": "#2563eb",
                      "Checked-in": "#785518"
                    };

                    return Object.entries(dashboardData.attendanceStatus).map(
                      ([status, value], index) => {
                        const percentage = total ? (value / total) * 100 : 0;
                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                        const strokeDashoffset = -cumulative;
                        cumulative += percentage;

                        return (
                          <circle
                            key={index}
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="transparent"
                            stroke={colors[status] || "#E5E7EB"}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      }
                    );
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-bold">
                    {dashboardData.totalEmployees}
                  </div>
                  <div className="text-xs text-muted-foreground">Employees</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6 text-sm">
                {Object.entries(dashboardData.attendanceStatus).map(
                  ([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-e-sm"
                        style={{
                          backgroundColor:
                            status === "Present"
                              ? "#16a34a"
                              : status === "HalfDay"
                                ? "#ca8a04"
                                : status === "Absent"
                                  ? "#dc2626"
                                  : status === "On Leave"
                                    ? "#2563eb"
                                    : "#785518"
                        }}
                      />
                      <span className="text-foreground">{status}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/60">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">Latest check-ins and leave requests</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="text-sm text-white bg-primary/50 p-2 rounded-sm flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-200">
                    <div className="h-4 w-4"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : dashboardData.recentActivities.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activities found</p>
            <p className="text-sm text-muted-foreground">Attendance records will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dashboardData.recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activity.type === 'checkin' ? 'bg-primary/60' : 'bg-primary/60'
                    }`}>
                    {activity.type === 'checkin' ? (
                      <Clock className="h-4 w-4 text-white" />
                    ) : (
                      <Calendar className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground">
                        {activity.employeeName}
                      </p>
                      {activity.type === 'checkin' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-white">
                          Checked {activity.status === 'Checked-in' ? 'In' : activity.status}
                        </span>
                      )}
                      {activity.type === 'leave' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-white">
                          {activity.leaveType} Leave
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.type === 'checkin'
                        ? `Checked in at ${activity.time}`
                        : `Leave period: ${activity.period}`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {activity.type === 'checkin' ? 'Today' : activity.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;