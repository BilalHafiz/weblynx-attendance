import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Frontend", value: 45, color: "hsl(0, 100%, 27%)" },
  { name: "Backend", value: 20, color: "hsl(355, 83%, 41%)" },
  { name: "Full-Stack", value: 25, color: "hsl(0, 100%, 35%)" },
  { name: "Sales", value: 30, color: "hsl(355, 83%, 50%)" },
  { name: "Design", value: 15, color: "hsl(0, 100%, 20%)" },
];

export function DepartmentStats() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Department Distribution</h3>
        <p className="text-sm text-muted-foreground">Employees by department</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 10%)",
                border: "1px solid hsl(0, 0%, 20%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
                color: "hsl(0, 0%, 100%)",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
