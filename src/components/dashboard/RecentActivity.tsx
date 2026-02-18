import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { format } from "date-fns";

const statusStyles = {
  "on-time": "bg-success/10 text-success border-success/20",
  HalfDay: "bg-warning/10 text-warning border-warning/20",
  leave: "bg-info/10 text-info border-info/20",
};

export function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivityData = async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", today))
      );

      const activityData: any[] = [];

      attSnap.forEach((doc) => {
        const data = doc.data();
        const { empId, name, avatar, checkIn, checkOut, status } = data;

        const time = checkIn ? checkIn : "N/A";
        const action = checkIn && checkOut ? "Clocked in" : "On leave";
        const timeStatus = checkIn && checkOut ? "on-time" : "leave";

        activityData.push({
          id: doc.id,
          user: name,
          avatar: avatar || "default_avatar_url",
          action: action,
          time: time,
          status: timeStatus,
        });
      });

      setActivities(activityData);
    };

    fetchActivityData();
  }, []);

  return (
    <div className="bg-card rounded-xl p-6 shadow-card animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Today's employee check-ins</p>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar} />
                <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{activity.user}</p>
                <p className="text-xs text-muted-foreground">{activity.action}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{activity.time}</span>
              <Badge
                variant="outline"
                className={statusStyles[activity.status as keyof typeof statusStyles]}
              >
                {activity.status === "on-time" ? "On Time" : activity.status === "HalfDay" ? "HalfDay" : "Leave"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
