import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Mon", present: 145, absent: 12 },
  { name: "Tue", present: 152, absent: 8 },
  { name: "Wed", present: 148, absent: 15 },
  { name: "Thu", present: 155, absent: 5 },
  { name: "Fri", present: 142, absent: 18 },
  { name: "Sat", present: 85, absent: 5 },
  { name: "Sun", present: 0, absent: 0 },
];

export function AttendanceChart() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Weekly Attendance</h3>
        <p className="text-sm text-muted-foreground">Employee attendance overview for this week</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 100%, 27%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 100%, 27%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(355, 83%, 41%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(355, 83%, 41%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(0, 0%, 80%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(0, 0%, 80%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(0, 0%, 20%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
                color: "hsl(0, 0%, 100%)",
              }}
            />
            <Area
              type="monotone"
              dataKey="present"
              stroke="hsl(0, 100%, 27%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPresent)"
            />
            <Area
              type="monotone"
              dataKey="absent"
              stroke="hsl(355, 83%, 41%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAbsent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">Absent</span>
        </div>
      </div>
    </div>
  );
}
