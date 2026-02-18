import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { setDoc, doc, serverTimestamp, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const AddEmployee = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    avatar: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Required Fields Missing",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch the last employee to get the latest ID
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef, orderBy("employeeId", "desc"), limit(1)); // Get the most recent employee
      const snapshot = await getDocs(q);

      let newEmployeeId = 1; // Default ID if no employee records exist
      if (!snapshot.empty) {
        const lastEmployee = snapshot.docs[0].data();
        newEmployeeId = lastEmployee.employeeId + 1; // Increment the last employee's ID
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        tempPassword
      );

      const user = userCredential.user;

      await sendPasswordResetEmail(auth, formData.email);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        role: "employee",
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        avatar: formData.avatar,
        createdAt: serverTimestamp(),
      });

      // Add the new employee with the auto-incremented employee ID
      await setDoc(doc(db, "employees", user.uid), {
        employeeId: newEmployeeId, // Use the auto-generated ID
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        avatar: formData.avatar,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Employee Added",
        description: "Password setup email sent to employee",
      });

      // Redirect to the newly created employee's profile page
      navigate(`/employee/${user.uid}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Add New Employee" subtitle="Create a new employee profile">
      <Card className="max-w-3xl mx-auto animate-slide-up shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Employee Information
          </CardTitle>
          <CardDescription>Enter personal details</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Employee first name"
              />
            </div>

            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Employee last name"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="employee@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Avatar URL</Label>
              <Input
                type="url"
                value={formData.avatar}
                onChange={(e) => handleInputChange("avatar", e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} variant="success" size="lg" className="gap-2">
              <Check className="h-4 w-4" />
              Save Employee
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AddEmployee;
