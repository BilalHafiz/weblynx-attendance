import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LeaveManagement from "@/components/LeaveManagement/LeaveManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Settings2,
  DoorOpen,
  FileText,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  format,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSaturday,
  isSunday,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isBefore,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { collection, doc, setDoc, getDocs, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase.ts";

interface Holiday {
  id: string;
  startDate: Date;
  endDate: Date;
  title: string;
  description: string;
  type: "public" | "company";
}

const Holiday = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState({
    startDate: new Date(),
    endDate: new Date(),
    title: "",
    description: "",
    type: "company" as "public" | "company",
  });
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    const ensureWeekendsSaved = async () => {
      try {
        await Promise.all([
          setDoc(
            doc(db, "workCalendar", "saturday"),
            { day: "Saturday", weekend: true },
            { merge: true }
          ),
          setDoc(
            doc(db, "workCalendar", "sunday"),
            { day: "Sunday", weekend: true },
            { merge: true }
          ),
        ]);
      } catch (error) {
        console.error("Error saving weekend data:", error);
      }
    };

    ensureWeekendsSaved();
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const holidayRef = collection(db, "holidays");
        const holidaySnapshot = await getDocs(holidayRef);

        const holidayList = holidaySnapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const toDate = (v: unknown) =>
              v instanceof Date ? v : (v as { toDate?: () => Date })?.toDate?.() ?? null;

            let startDate: Date | null = toDate(data.startDate);
            let endDate: Date | null = toDate(data.endDate);
            if (!startDate || !endDate) {
              const single = toDate(data.date);
              if (!single) return null;
              startDate = endDate = single;
            }

            if (!data.title || !data.type) return null;
            if (isBefore(endDate, startDate)) endDate = startDate;

            return {
              id: docSnap.id,
              startDate,
              endDate,
              title: data.title,
              description: data.description || "",
              type: data.type as "public" | "company",
            };
          })
          .filter((h): h is Holiday => h !== null);

        setHolidays(holidayList);
      } catch (error) {
        console.error("Error fetching holidays:", error);
        toast({
          title: "Error",
          description: "Failed to load holiday data",
          variant: "destructive",
        });
      }
    };

    fetchHolidays();
  }, []);

  const getHolidayForDate = (date: Date) =>
    holidays.find((h) =>
      isWithinInterval(date, { start: startOfDay(h.startDate), end: endOfDay(h.endDate) })
    );

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isWeekendOff = (date: Date) => isSaturday(date) || isSunday(date);

  const handleAddHoliday = async () => {
    if (!newHoliday.title.trim()) {
      toast({ title: "Error", description: "Please enter a holiday title", variant: "destructive" });
      return;
    }
    const { startDate, endDate } = newHoliday;
    if (isBefore(endDate, startDate)) {
      toast({ title: "Error", description: "End date cannot be before start date", variant: "destructive" });
      return;
    }

    const id = doc(collection(db, "holidays")).id;
    const holiday: Holiday = {
      id,
      startDate,
      endDate,
      title: newHoliday.title,
      description: newHoliday.description,
      type: newHoliday.type,
    };

    try {
      await setDoc(doc(db, "holidays", id), {
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        title: holiday.title,
        description: holiday.description,
        type: holiday.type,
      });
      setHolidays([...holidays, holiday]);
      setIsAddHolidayOpen(false);
      setNewHoliday({ startDate: new Date(), endDate: new Date(), title: "", description: "", type: "company" });
      toast({ title: "Holiday Added", description: `${holiday.title} added successfully` });
    } catch {
      toast({ title: "Error", description: "Failed to add holiday", variant: "destructive" });
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHoliday) return;
    if (isBefore(editingHoliday.endDate, editingHoliday.startDate)) {
      toast({ title: "Error", description: "End date cannot be before start date", variant: "destructive" });
      return;
    }
    await setDoc(doc(db, "holidays", editingHoliday.id), {
      startDate: Timestamp.fromDate(editingHoliday.startDate),
      endDate: Timestamp.fromDate(editingHoliday.endDate),
      title: editingHoliday.title,
      description: editingHoliday.description,
      type: editingHoliday.type,
    });
    setHolidays(holidays.map((h) => (h.id === editingHoliday.id ? editingHoliday : h)));
    setEditingHoliday(null);
  };

  const handleDeleteHoliday = async (id: string) => {
    await deleteDoc(doc(db, "holidays", id));
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const calculateWorkingDays = () => {
    let workingDays = 0;
    let holidaysCount = 0;
    let weekends = 0;

    daysInMonth.forEach((day) => {
      if (isWeekendOff(day)) weekends++;
      else if (getHolidayForDate(day)) holidaysCount++;
      else workingDays++;
    });

    return { workingDays, holidays: holidaysCount, weekends, total: daysInMonth.length };
  };

  const stats = calculateWorkingDays();

  return (
    <DashboardLayout title="Holiday And Leaves" subtitle="Manage attendance rules, holidays, and system settings">
      <div className="space-y-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Working Days</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.workingDays}</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Holidays</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.holidays}</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Weekend Offs</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.weekends}</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10">
                  <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Days</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted/50 p-1 w-full sm:w-auto">
            <TabsTrigger value="calendar" className="data-[state=active]:bg-background flex-1 sm:flex-none text-xs sm:text-sm">
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Holiday Calendar</span>
              <span className="sm:hidden">Holidays</span>
            </TabsTrigger>
            <TabsTrigger value="Leave" className="data-[state=active]:bg-background flex-1 sm:flex-none text-xs sm:text-sm">
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Leave Management</span>
              <span className="sm:hidden">Leave</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Holiday Calendar</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage company and public holidays</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-8 w-8 sm:h-10 sm:w-10">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold min-w-[100px] sm:min-w-[140px] text-center text-sm sm:text-base">
                      {format(currentMonth, "MMM yyyy")}
                    </span>
                    <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8 sm:h-10 sm:w-10">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div key={`${day}-${i}`} className="p-1 sm:p-2 text-center text-[10px] sm:text-sm font-medium text-muted-foreground">
                        <span className="sm:hidden">{day}</span>
                        <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                      </div>
                    ))}

                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2" />
                    ))}

                    {daysInMonth.map(day => {
                      const holiday = getHolidayForDate(day);
                      const isWeekend = isWeekendOff(day);
                      const isCurrentDay = isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] rounded-md sm:rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                            isCurrentDay && "ring-2 ring-primary",
                            holiday && "bg-accent/10 border-accent/30",
                            isWeekend && !holiday && "bg-orange-500/10 border-orange-500/30",
                            !holiday && !isWeekend && "bg-card hover:bg-muted/50"
                          )}
                          onClick={() => {
                            if (!holiday) {
                              setNewHoliday((prev) => ({ ...prev, startDate: day, endDate: day }));
                              setIsAddHolidayOpen(true);
                            }
                          }}
                        >
                          <div className="flex flex-col h-full">
                            <span className={cn(
                              "text-[10px] sm:text-sm font-medium",
                              isCurrentDay && "text-primary",
                              isWeekend && "text-orange-600"
                            )}>
                              {format(day, "d")}
                            </span>
                            {holiday && (
                              <div className="mt-0.5 sm:mt-1 hidden sm:block">
                                <Badge variant="secondary" className="text-[10px] sm:text-xs truncate max-w-full bg-accent/20 text-accent-foreground">
                                  {holiday.title}
                                </Badge>
                              </div>
                            )}
                            {holiday && (
                              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1 sm:hidden" />
                            )}
                            {isWeekend && !holiday && (
                              <span className="text-[8px] sm:text-xs text-orange-600 mt-0.5 sm:mt-1 hidden sm:block">
                                {isSaturday(day) ? "Sat Off" : "Sun Off"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-accent/30" />
                      <span className="text-[10px] sm:text-sm text-muted-foreground">Holiday</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-orange-500/30" />
                      <span className="text-[10px] sm:text-sm text-muted-foreground">Weekend Off</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded ring-2 ring-primary" />
                      <span className="text-[10px] sm:text-sm text-muted-foreground">Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Holiday List</CardTitle>
                    <CardDescription>All configured holidays</CardDescription>
                  </div>
                  <Dialog
                    open={isAddHolidayOpen}
                    onOpenChange={(open) => {
                      setIsAddHolidayOpen(open);
                      if (open) {
                        const today = new Date();
                        setNewHoliday({ startDate: today, endDate: today, title: "", description: "", type: "company" });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-to-r from-primary to-accent">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Holiday</DialogTitle>
                        <DialogDescription>Create a new holiday entry</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {format(newHoliday.startDate, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={newHoliday.startDate}
                                onSelect={(d) => {
                                  if (d) {
                                    setNewHoliday((prev) => {
                                      const start = d;
                                      const end = isBefore(prev.endDate, start) ? start : prev.endDate;
                                      return { ...prev, startDate: start, endDate: end };
                                    });
                                    setStartDateOpen(false);
                                  }
                                }}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                {format(newHoliday.endDate, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={newHoliday.endDate}
                                disabled={(date) => isBefore(date, newHoliday.startDate)}
                                onSelect={(d) => {
                                  if (d) {
                                    setNewHoliday((prev) => ({ ...prev, endDate: d }));
                                    setEndDateOpen(false);
                                  }
                                }}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {isBefore(newHoliday.endDate, newHoliday.startDate) && (
                          <p className="text-sm text-destructive">End date cannot be before start date.</p>
                        )}
                        <div className="space-y-2">
                          <Label>Holiday Title</Label>
                          <Input
                            placeholder="Enter holiday name"
                            value={newHoliday.title}
                            onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (Optional)</Label>
                          <Textarea
                            placeholder="Enter description"
                            value={newHoliday.description}
                            onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={newHoliday.type}
                            onValueChange={(value: "public" | "company") => setNewHoliday({ ...newHoliday, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public Holiday</SelectItem>
                              <SelectItem value="company">Company Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddHolidayOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddHoliday} className="bg-gradient-to-r from-primary to-accent">Add Holiday</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {holidays.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No holidays configured</p>
                    ) : (
                      holidays.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()).map(holiday => {
                        const isRange = holiday.startDate.getTime() !== holiday.endDate.getTime();
                        const dateLabel = isRange
                          ? `${format(holiday.startDate, "dd MMM yyyy")} – ${format(holiday.endDate, "dd MMM yyyy")}`
                          : format(holiday.startDate, "PPP");
                        return (
                        <div
                          key={holiday.id}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{holiday.title}</p>
                              <p className="text-xs text-muted-foreground">{dateLabel}</p>
                              {isRange && (
                                <p className="text-[10px] text-muted-foreground/80">
                                  {Math.ceil((holiday.endDate.getTime() - holiday.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                                </p>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {holiday.type === "public" ? "Public" : "Company"}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingHoliday(holiday)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteHoliday(holiday.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ); })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Dialog open={!!editingHoliday} onOpenChange={() => setEditingHoliday(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Holiday</DialogTitle>
                  <DialogDescription>Update holiday details and date range</DialogDescription>
                </DialogHeader>
                {editingHoliday && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(editingHoliday.startDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editingHoliday.startDate}
                            onSelect={(d) => {
                              if (d) {
                                const end = isBefore(editingHoliday.endDate, d) ? d : editingHoliday.endDate;
                                setEditingHoliday({ ...editingHoliday, startDate: d, endDate: end });
                              }
                            }}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(editingHoliday.endDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editingHoliday.endDate}
                            disabled={(date) => isBefore(date, editingHoliday.startDate)}
                            onSelect={(d) => d && setEditingHoliday({ ...editingHoliday, endDate: d })}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Holiday Title</Label>
                      <Input
                        value={editingHoliday.title}
                        onChange={(e) => setEditingHoliday({ ...editingHoliday, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editingHoliday.description}
                        onChange={(e) => setEditingHoliday({ ...editingHoliday, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editingHoliday.type}
                        onValueChange={(value: "public" | "company") => setEditingHoliday({ ...editingHoliday, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public Holiday</SelectItem>
                          <SelectItem value="company">Company Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingHoliday(null)}>Cancel</Button>
                  <Button onClick={handleUpdateHoliday} className="bg-gradient-to-r from-primary to-accent">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="Leave" className="space-y-6">
            <LeaveManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Holiday;