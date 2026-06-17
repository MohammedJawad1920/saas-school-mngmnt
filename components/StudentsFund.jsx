"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  Plus,
  Minus,
  History,
  Calendar,
  FileText,
  Trash2,
  Loader,
  Users,
  Printer,
  Search,
  ScanBarcode,
  X,
} from "lucide-react";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading scanner...</p>
    </div>
  ),
});

const StudentsFund = ({
  batches = [],
  students = [],
  classes = [],
  apiKey,
  teacherId,
  department,
}) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [studentBalance, setStudentBalance] = useState(0);
  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showClearHistoryDialogue, setShowClearHistoryDialogue] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [transactions, setTransactions] = useState([]);
  const amountInputRef = useRef(null);
  const noteInputRef = useRef(null);
  const depositButtonRef = useRef(null);
  const withdrawalButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const finalConfirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const pendingFocusRef = useRef(false);
  const [showQuickPaymentDialog, setShowQuickPaymentDialog] = useState(false);
  const [quickPaymentData, setQuickPaymentData] = useState(null);
  const [quickPaymentAmount, setQuickPaymentAmount] = useState("");
  const [lookupSearchTerm, setLookupSearchTerm] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [clearOnNextInput, setClearOnNextInput] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const printRef = useRef();
  const allStudentsFundRef = useRef();

  const isMobile = useIsMobile();

  const transactionLabels = useMemo(() => {
    if (department) {
      return {
        deposit: "Received",
        withdrawal: "Receivable",
      };
    }
    return {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
    };
  }, [department]);

  const { useFetchItems, useAddItem, useUpdateItem } = useCrud(
    "studentsFund",
    apiKey || ""
  );

  useEffect(() => {
    if (!apiKey) {
      console.warn("StudentsFund: apiKey is missing. API calls may fail.");
    }
  }, [apiKey]);

  const fetchStudentFundQuery = useFetchItems(
    0,
    0,
    {
      studentId: selectedStudents.length === 1 ? selectedStudents[0] : undefined,
      teacherId: department ? undefined : teacherId,
      department,
      batchId: selectedBatch,
      projection: "studentId,balance,transactions,batchId,fundType,teacherId,department",
      includeSummary: !!selectedBatch ? "true" : "false",
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled:
        !!(teacherId || department) &&
        !!selectedBatch,
    }
  );

  const allStudentsFund = useMemo(() => {
    const rawFunds = fetchStudentFundQuery.data?.allStudentsFund || [];
    
    // Use a Map to ensure unique students by ID, keeping the latest/most relevant record 
    // or just the first one found since we just need one entry per student.
    const uniqueStudentsMap = new Map();

    // Filter to only include students who actually belong to the selected batch
    rawFunds.forEach(studentFund => {
      if (!selectedBatch) return;
      
      // 1. Batch Filtering: studentId is populated with studentSpecificField.batchId
      const s = studentFund.studentId?.studentSpecificField;
      const studentBatchId = studentFund.studentId?.batchId || s?.batchId?._id || s?.batchId;
      let belongsToBatch = studentBatchId === selectedBatch;
      
      const studentClassId = studentFund.studentId?.classId || s?.classId?._id || s?.classId;
      if (!belongsToBatch && studentClassId && classes) {
        const studentClass = classes.find(c => c._id === studentClassId);
        if (studentClass && studentClass.batchId === selectedBatch) {
          belongsToBatch = true;
        }
      }
      
      if (!belongsToBatch) return;

      // 2. Zero-Balance Filtering: Hide zero balance students
      if ((studentFund.balance || 0) === 0) return;

      // 3. Unique Student Filtering: Prevent duplicates
      const studentId = studentFund.studentId?._id;
      if (studentId) {
        // If the student is already in the map, we have a duplicate.
        // We can either keep the first one or add their balances. 
        // Assuming the latest fetch has the correct total balance, we'll keep the first valid one we see.
        if (!uniqueStudentsMap.has(studentId)) {
          uniqueStudentsMap.set(studentId, studentFund);
        }
      }
    });

    return Array.from(uniqueStudentsMap.values());
  }, [fetchStudentFundQuery.data, selectedBatch, department, classes]);

  const allStudentBalance = useMemo(() => {
    return allStudentsFund.reduce((total, studentFund) => {
      return total + (studentFund.balance || 0);
    }, 0);
  }, [allStudentsFund]);

  const addStudentFund = useAddItem();

  const updateStudentFund = useUpdateItem();

  const studentFund = useMemo(() => {
    return fetchStudentFundQuery.data?.studentFund || {};
  }, [fetchStudentFundQuery.data, selectedStudents, selectedBatch]);

  useEffect(() => {
    if (fetchStudentFundQuery.data && studentFund && selectedStudents.length <= 1) {
      const balance = studentFund.balance;
      setStudentBalance(balance || 0);
      setTransactions(
        [...(studentFund?.transactions || [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )
      );
    } else {
      setStudentBalance(0);
      setTransactions([]);
    }
  }, [studentFund, selectedStudents]);

  useEffect(() => {
    if (pendingFocusRef.current && depositButtonRef.current) {
      depositButtonRef.current.focus();
      pendingFocusRef.current = false;
    }
  });

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString());
  }, []);


  useEffect(() => {
    if (showConfirmDialog && finalConfirmButtonRef.current) {
      setTimeout(() => {
        finalConfirmButtonRef.current.focus();
      }, 0);
    }
  }, [showConfirmDialog]);

  // Filter students based on selected batch, sorted by admission number ascending
  const availableStudents = useMemo(() => {
    return students
      .filter(
        (student) => {
          const batchId = student.batchId || student.studentSpecificField?.batchId?._id || student.studentSpecificField?.batchId;
          if (batchId === selectedBatch) return true;
          
          const classId = student.classId || student.studentSpecificField?.classId?._id || student.studentSpecificField?.classId;
          if (classId && classes) {
            const studentClass = classes.find((c) => c._id === classId);
            if (studentClass && studentClass.batchId === selectedBatch) {
              return true;
            }
          }
          return false;
        }
      )
      .sort((a, b) => {
        const aVal = String(a.studentSpecificField?.admissionNumber ?? a.admissionNumber ?? a._id ?? "");
        const bVal = String(b.studentSpecificField?.admissionNumber ?? b.admissionNumber ?? b._id ?? "");
        return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [students, classes, selectedBatch]);

  const searchResults = useMemo(() => {
    const term = lookupSearchTerm.trim().toLowerCase();
    if (!term || term.length < 1 || !showSearchResults) return [];

    return students.filter(s => 
      s.name.toLowerCase().includes(term) || 
      String(s._id).toLowerCase().includes(term) ||
      (s.studentSpecificField?.admissionNumber && 
       String(s.studentSpecificField.admissionNumber).toLowerCase().includes(term))
    ).map(s => {
      const batch = batches.find(b => b._id === s.batchId);
      // Use the className and batchName already provided by the API if lookup fails
      return {
        ...s,
        batchName: batch?.name || s.batchName || "No Batch",
        className: s.className || "No Class"
      };
    });
  }, [lookupSearchTerm, students, batches, classes, showSearchResults]);

  const transactionsWithBalance = useMemo(() => {
    let currentBalance = studentBalance;
    // Ensure transactions are sorted by date descending (newest first)
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return sortedTransactions.map((transaction) => {
      const balanceAfter = currentBalance;
      // Calculate balance before this transaction for the next iteration
      // If was Deposit, balance BEFORE was balanceAfter - amount
      // If was Withdrawal, balance BEFORE was balanceAfter + amount
      if (transaction.type === "Deposit") {
        currentBalance -= transaction.amount;
      } else {
        currentBalance += transaction.amount;
      }
      return { ...transaction, balanceAfter };
    });
  }, [transactions, studentBalance]);

  const globalTransactions = useMemo(() => {
    if (!department || !allStudentsFund) return [];

    const allTx = [];
    allStudentsFund.forEach(student => {
      if (student.transactions) {
        student.transactions.forEach(tx => {
          allTx.push({
            ...tx,
            studentName: student.studentId?.name || "Unknown",
            studentId: student.studentId?._id
          });
        });
      }
    });

    return allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allStudentsFund, department]);

  const selectedBatchData = useMemo(() => {
    return batches.find((batch) => batch._id === selectedBatch) || {};
  }, [selectedBatch]);

  const dropdownOptions = useMemo(() => {
    if (!selectedBatch) return [];

    const batchOption = {
      value: selectedBatchData._id,
      label: selectedBatchData.name,
      isBatch: true, // Custom property to identify the batch option
    };

    const studentOptions = availableStudents.map((student) => ({
      ...student,
      value: student._id,
      label: `${student.name} (${student.studentSpecificField?.admissionNumber || student.admissionNumber || student._id})`,
    }));

    return [batchOption, ...studentOptions];
  }, [selectedBatch, availableStudents, selectedBatchData]);

  const handleTransaction = () => {
    if (!amount || !transactionType) return;
    setShowConfirmDialog(true);
  };

  const confirmTransaction = async () => {
    setLoading(true);
    console.log("Confirming Transaction. Selected Students Count:", selectedStudents.length);
    console.log("Selected Students IDs:", selectedStudents);

    if (selectedStudents.length > 1) {
      // Bulk Transaction Logic
      try {
        console.log("Sending Bulk Transaction:", {
          batchId: selectedBatch,
          studentIds: selectedStudents,
          department,
          fundType: department ? "Department" : "Individual",
        });
        const response = await fetch("/api/studentsFund/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            batchId: selectedBatch,
            studentIds: selectedStudents,
            transaction: {
              type: transactionType,
              amount: parseFloat(amount),
              note,
            },
            teacherId: department ? undefined : teacherId,
            department,
            fundType: department ? "Department" : "Individual",
          }),
        });

        if (!response.ok) throw new Error("Bulk transaction failed");

        toast.success("Bulk transaction processed successfully");
        setShowConfirmDialog(false);
        setAmount("");
        setNote("");
        fetchStudentFundQuery.refetch();
        setTransactionType("");
      } catch (error) {
        console.error("Bulk transaction error:", error);
        toast.error("Failed to process bulk transaction");
      } finally {
        setLoading(false);
      }
    } else {
      // Single Transaction Logic
      const isBatchTransaction = selectedStudents.length === 0;
      const currentStudentId = isBatchTransaction
        ? undefined
        : selectedStudents[0];

      const originalBalance = studentBalance;
      const newBalance =
        (transactionType === "Deposit"
          ? originalBalance + parseFloat(amount)
          : originalBalance - parseFloat(amount)) || 0;

      const transaction = {
        type: transactionType,
        amount: parseFloat(amount),
        note,
      };

      // Optimistically update UI
      const newTransaction = {
        ...transaction,
        _id: `temp-${Date.now()}`,
        date: new Date().toISOString(),
      };
      const previousTransactions = transactions;

      setStudentBalance(newBalance);
      setTransactions((prev) => [newTransaction, ...prev]);
      setShowConfirmDialog(false);
      setAmount("");
      setNote("");

      addStudentFund.mutate(
        {
          studentId: currentStudentId,
          teacherId: department ? undefined : teacherId,
          department,
          fundType: department ? "Department" : "Individual",
          batchId: selectedBatch,
          transaction: {
            ...transaction,
            performedBy: teacherId,
          },
          balance: newBalance,
        },
        {
          onSuccess: () => {
            fetchStudentFundQuery.refetch();
          },
          onError: (error) => {
            console.error(
              "Transaction failed, reverting optimistic update:",
              error
            );
            setStudentBalance(originalBalance);
            setTransactions(previousTransactions);
          },
          onSettled: () => {
            setLoading(false);
            setTransactionType("");
          },
        }
      );
    }
  };

  const handleClearHistory = async () => {
    try {
      console.log("Clearing history for:", {
        studentId: selectedStudents.length === 1 ? selectedStudents[0] : undefined,
        department,
        fundType: department ? "Department" : "Individual",
        batchId: selectedBatch,
      });

      await updateStudentFund.mutateAsync({
        data: {
          studentId:
            selectedStudents.length === 1 ? selectedStudents[0] : undefined,
          teacherId: department ? undefined : teacherId,
          department,
          fundType: department ? "Department" : "Individual",
          batchId: selectedBatch,
        },
      });
      console.log("History cleared successfully");
      await fetchStudentFundQuery.refetch();
      setShowHistoryDialog(false);
      setShowClearHistoryDialogue(false);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const initiateQuickPayment = (student) => {
    setQuickPaymentData({
      id: student.studentId?._id,
      name: student.studentId?.name || "Unknown",
      currentBalance: student.balance || 0,
    });
    setQuickPaymentAmount("");
    setShowQuickPaymentDialog(true);
  };

  const handleQuickPayment = async () => {
    if (!quickPaymentAmount || !quickPaymentData) return;

    setLoading(true);
    try {
      const amount = parseFloat(quickPaymentAmount);
      const newBalance = (quickPaymentData.currentBalance || 0) + amount; // Deposit increases balance

      await addStudentFund.mutateAsync({
        studentId: quickPaymentData.id,
        teacherId: department ? undefined : teacherId,
        department,
        fundType: department ? "Department" : "Individual",
        batchId: selectedBatch,
        transaction: {
          type: "Deposit", // Mapped to "Received"
          amount: amount,
          note: "Quick Payment via Balance List",
          performedBy: teacherId,
        },
        balance: newBalance,
      });

      toast.success("Payment received successfully");
      setShowQuickPaymentDialog(false);
      fetchStudentFundQuery.refetch();
    } catch (error) {
      console.error("Quick payment failed:", error);
      toast.error("Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const selectedStudentData =
    selectedStudents.length === 1
      ? students.find((s) => s._id === selectedStudents[0])
      : null;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Transaction History - ${selectedStudentData?.name}`,
  });
  const handleAllStudentsFundPrint = useReactToPrint({
    contentRef: allStudentsFundRef,
    documentTitle: `All Students Balance - ${selectedBatchData?.name}`,
  });

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    const element = printRef.current;
    const opt = {
      margin: 0.5,
      filename: `Transaction_History_${new Date().toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };
  const handleAllStudentsFundDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;

    const element = allStudentsFundRef.current;
    const opt = {
      margin: 0.5,
      filename: `All_Students_Balance_${selectedBatchData?.name}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleStudentLookup = (overrideSearchTerm) => {
    const term = (typeof overrideSearchTerm === "string" ? overrideSearchTerm : lookupSearchTerm).trim();

    if (!term) {
      toast.error("Please enter a student ID or name to search.");
      return;
    }

    setIsLookingUp(true);

    const searchLower = term.toLowerCase();
    const studentsList = students || [];

    // Prioritized search in the loaded students array
    // 1. Exact ID
    let foundStudent = studentsList.find(s => String(s._id).toLowerCase() === searchLower);

    // 2. Exact Admission Number
    if (!foundStudent) {
      foundStudent = studentsList.find(s =>
        String(s.studentSpecificField?.admissionNumber).toLowerCase() === searchLower
      );
    }

    // 3. Exact Name
    if (!foundStudent) {
      foundStudent = studentsList.find(s => String(s.name).toLowerCase() === searchLower);
    }

    // 4. Fallback: Prefix matching / first matching
    if (!foundStudent) {
      foundStudent = studentsList.find(s =>
        String(s._id).toLowerCase().trim().startsWith(searchLower) ||
        String(s.name).toLowerCase().trim().startsWith(searchLower) ||
        (s.studentSpecificField?.admissionNumber &&
          String(s.studentSpecificField.admissionNumber).toLowerCase().trim().startsWith(searchLower))
      );

      if (foundStudent) {
        // Check for multiple partial matches
        const totalMatches = studentsList.filter(s =>
          String(s._id).toLowerCase().trim().includes(searchLower) ||
          String(s.name).toLowerCase().trim().includes(searchLower)
        ).length;

        if (totalMatches > 1) {
          toast.info(`Showing best match: ${foundStudent.name}`);
        }
      }
    }

    if (foundStudent) {
      if (foundStudent.batchId) {
        setSelectedBatch(foundStudent.batchId);
        setSelectedStudents([foundStudent._id]);
        setTransactionType("Deposit");
        toast.success(`Found student: ${foundStudent.name}`);
        setClearOnNextInput(true);
        pendingFocusRef.current = true;
      } else {
        toast.error("Student found, but they are not assigned to a batch.");
        setSelectedStudents([]);
        setSelectedBatch("");
      }
    } else {
      toast.error("Student not found. Ensure the student is loaded in this view.");
      if (typeof overrideSearchTerm !== "string") {
        setSelectedStudents([]);
        setSelectedBatch("");
      }
    }

    setIsLookingUp(false);
  };

  const handleBarcodeScan = (result) => {
    setLookupSearchTerm(result);
    setShowScanner(false);
    // Use a small timeout to ensure state is updated or just pass it directly
    handleStudentLookup(result);
  };




  return (
    <div className="min-h-screen">
      <Header
        title={department ? `${department.toUpperCase()} FUND` : "STUDENTS FUND"}
        subTitle={
          department
            ? `Manage ${department} Fund Activities`
            : "Review Student Fund Activities"
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="w-full border-primary/20 shadow-sm relative bg-card">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="bg-muted/10 pb-4 pt-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Student Lookup
              </CardTitle>
              <CardDescription>
                Search for a student by ID or Name
              </CardDescription>
              <div className="flex gap-2 mt-4 w-full">
                <div className="relative flex-1">
                    <Input
                      autoFocus
                      placeholder="Search by Student ID or Name..."
                      value={lookupSearchTerm}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (clearOnNextInput) {
                          const oldVal = lookupSearchTerm;
                          let typed = val;
                          if (val.length > oldVal.length && val.startsWith(oldVal)) {
                            typed = val.slice(oldVal.length);
                          }
                          setLookupSearchTerm(typed);
                          setClearOnNextInput(false);
                        } else {
                          setLookupSearchTerm(val);
                        }
                        setShowSearchResults(true);
                      }}
                      onFocus={(e) => {
                        e.target.select();
                        setShowSearchResults(true);
                      }}
                      onBlur={() => {
                        // Delay closing to allow clicking on results
                        setTimeout(() => setShowSearchResults(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (searchResults.length === 1) {
                            handleStudentLookup(searchResults[0]._id);
                            setShowSearchResults(false);
                          } else {
                            handleStudentLookup();
                          }
                        }
                      }}
                      className="w-full pr-10"
                    />
                    {lookupSearchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent"
                        onClick={() => {
                          setLookupSearchTerm("");
                          setSelectedStudents([]);
                          setSelectedBatch("");
                          setShowSearchResults(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-[999] left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
                        {searchResults.map((student) => (
                          <div
                            key={student._id}
                            className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              handleStudentLookup(student._id);
                              setShowSearchResults(false);
                            }}
                          >
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={student.profilePic?.url} />
                              <AvatarFallback>{student.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-sm">
                              <div className="font-medium truncate">{student.name}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                                <span>ID: {student._id}</span>
                              </div>
                              <div className="text-[11px] text-primary/70 font-semibold truncate">
                                {student.className} • {student.batchName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                <Button
                  onClick={() => {
                    if (lookupSearchTerm.trim()) {
                      handleStudentLookup();
                    } else {
                      setShowScanner(true);
                    }
                  }}
                  disabled={isLookingUp}
                  variant={lookupSearchTerm.trim() ? "default" : "outline"}
                  className={!lookupSearchTerm.trim() ? "bg-foreground text-background hover:opacity-90 transition-all border-none shrink-0 shadow-sm" : ""}
                  size={!lookupSearchTerm.trim() ? "icon" : "default"}
                >
                  {isLookingUp ? (
                    <Loader className={`h-4 w-4 animate-spin ${lookupSearchTerm.trim() ? "sm:mr-2" : ""}`} />
                  ) : lookupSearchTerm.trim() ? (
                    <Search className="h-4 w-4 sm:mr-2" />
                  ) : (
                    <ScanBarcode className="h-5 w-5" />
                  )}
                  {lookupSearchTerm.trim() && (
                    <span className="hidden sm:inline">Search</span>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-6">
              <>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <Select
                      value={selectedBatch}
                      onValueChange={(val) => {
                        setSelectedBatch(val);
                        setSelectedStudents([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch._id} value={batch._id}>
                            {batch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedBatch && (
                    <div className="space-y-2 flex-1 w-full">
                      <MultiSelect
                        options={dropdownOptions}
                        onValueChange={setSelectedStudents}
                        value={selectedStudents}
                        placeholder="Select students"
                        multiSelect={true}
                      />
                    </div>
                  )}
                </div>


              </>
            </CardContent>
          </Card>

          {/* Student Balance & Transaction Form */}
          {(selectedStudents.length > 0 || selectedBatch) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fund Management
                </CardTitle>
                <CardDescription>
                  Current balance and transaction controls
                </CardDescription>
              </CardHeader>
              {fetchStudentFundQuery.isLoading ? (
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-center">
                    <Loader className="mr-2 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {/* Student Info & Balance */}
                  <div className="flex items-center justify-between p-4 bg-accent rounded-lg border">
                    <div className="flex items-center gap-3">
                      {selectedStudents.length > 1 ? (
                        <div>
                          <h3 className="font-semibold text-sm md:text-base text-foreground">
                            {selectedStudents.length} Students Selected
                          </h3>
                        </div>
                      ) : selectedStudents.length === 1 &&
                        selectedStudents[0] !== selectedBatchData?._id ? (
                        <>
                          <Avatar className="h-7 md:h-12 w-7 md:w-12">
                            <AvatarImage
                              src={selectedStudentData?.profilePic?.url}
                            />
                            <AvatarFallback>
                              {selectedStudentData?.name
                                ?.charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-sm md:text-base text-foreground">
                              {selectedStudentData?.name}
                            </h3>
                            <p className="text-xs md:text-sm text-accent-foreground">
                              Student ID: {selectedStudents[0]}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <h3 className="font-semibold text-sm md:text-base text-foreground">
                            {selectedBatchData?.name}
                          </h3>
                        </div>
                      )}
                    </div>
                    {selectedStudents.length <= 1 && (
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-accent-foreground">
                          Current Balance
                        </p>
                        <p
                          className={`text-lg md:text-2xl font-bold ${studentBalance < 0
                            ? "text-destructive"
                            : "text-green-600"
                            }`}
                        >
                          {studentBalance
                            ? `₹ ${studentBalance?.toFixed(2)}`
                            : "₹ 0.00"}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Transaction Type Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      ref={depositButtonRef}
                      variant={
                        transactionType === "Deposit" ? "default" : "outline"
                      }
                      onClick={() => {
                        setTransactionType("Deposit");
                        setTimeout(() => amountInputRef.current?.focus(), 0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight") {
                          setTransactionType("Withdrawal");
                          setTimeout(() => withdrawalButtonRef.current?.focus(), 0);
                        } else if (e.key === "Enter") {
                          setTimeout(() => amountInputRef.current?.focus(), 0);
                        }
                      }}
                      className="h-16 flex-col gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      {transactionLabels.deposit}
                    </Button>
                    <Button
                      ref={withdrawalButtonRef}
                      variant={
                        transactionType === "Withdrawal" ? "default" : "outline"
                      }
                      onClick={() => {
                        setTransactionType("Withdrawal");
                        setTimeout(() => amountInputRef.current?.focus(), 0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") {
                          setTransactionType("Deposit");
                          setTimeout(() => depositButtonRef.current?.focus(), 0);
                        } else if (e.key === "Enter") {
                          setTimeout(() => amountInputRef.current?.focus(), 0);
                        }
                      }}
                      className={`h-16 flex-col gap-2 ${transactionType === "Withdrawal"
                        ? "!bg-destructive !text-destructive-foreground"
                        : ""
                        }`}
                    >
                      <Minus className="h-5 w-5" />
                      {transactionLabels.withdrawal}
                    </Button>
                  </div>

                  {/* Amount Input */}
                  {transactionType && (
                    <div
                      className="space-y-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          noteInputRef.current.focus();
                        }
                      }}
                    >
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        ref={amountInputRef}
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        step="0.01"
                      />
                    </div>
                  )}

                  {/* Note Input */}
                  {transactionType && (
                    <div className="space-y-2">
                      <Label htmlFor="note">Note</Label>
                      <Input
                        ref={noteInputRef}
                        id="note"
                        placeholder="Enter transaction note or description"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            confirmButtonRef.current.focus();
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  {transactionType && (
                    <Button
                      ref={confirmButtonRef}
                      onClick={handleTransaction}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleTransaction();
                        }
                      }}
                      disabled={!amount || loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? "Processing..." : `Confirm ${transactionType === "Deposit" ? transactionLabels.deposit : transactionLabels.withdrawal}`}
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* All Students Balance Table for Department Funds */}
          {department && selectedBatch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Students Balance
                  </div>
                  <Button
                    onClick={handleAllStudentsFundPrint}
                    title="Print Balance Sheet"
                    className="gap-2 btn-print"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </CardTitle>
                <CardDescription>
                  Balance history for all students in {selectedBatchData?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border" ref={allStudentsFundRef}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Sl No</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allStudentsFund.map((student, index) => (
                        <TableRow key={student._id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            {student.studentId?.studentSpecificField?.admissionNumber ||
                              student.studentId?._id ||
                              "-"}
                          </TableCell>
                          <TableCell>
                            {student.studentId?.name 
                              ? `${student.studentId.name} (${student.studentId.studentSpecificField?.admissionNumber || student.studentId._id})`
                              : "Unknown"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${(student.balance || 0) < 0
                              ? "text-destructive"
                              : "text-green-600"
                              } ${department ? "cursor-pointer hover:underline" : ""}`}
                            onClick={() => department && initiateQuickPayment(student)}
                          >
                            ₹ {(student.balance || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {allStudentsFund.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground h-24"
                          >
                            No students found with balance history.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>Recent fund activities</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStudents.length <= 1 && !department ? (
                <div className="space-y-4">
                  <div className="max-h-[320px] overflow-y-auto hide-scrollbar">
                    {transactionsWithBalance?.length > 0 ? (
                      transactionsWithBalance?.slice(0, 5).map((transaction) => (
                        <div
                          key={transaction._id}
                          className="border-b pb-4 mb-4 last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={
                                transaction.type === "Deposit"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {transaction.type === "Deposit" ? transactionLabels.deposit : transactionLabels.withdrawal}
                            </Badge>
                            <span className="text-sm text-accent-foreground">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="font-semibold text-lg">
                              {transaction.type === "Deposit" ? "+" : "-"}₹
                              {(transaction.amount || 0).toLocaleString()}
                            </p>
                            <p
                              className={`font-bold text-base ${transaction.balanceAfter < 0
                                ? "text-destructive"
                                : "text-green-600"
                                }`}
                            >
                              Bal: ₹{transaction.balanceAfter.toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-accent-foreground mb-1">
                            {transaction.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-accent-foreground py-8">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions found</p>
                      </div>
                    )}
                  </div>

                  <Dialog
                    open={showHistoryDialog}
                    onOpenChange={setShowHistoryDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        View Full History
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <div
                        className="space-y-4 max-h-full overflow-y-auto hide-scrollbar  "
                      >
                        <DialogHeader>
                          <DialogTitle>
                            Complete Transaction History
                          </DialogTitle>
                          <DialogDescription>
                            All transactions for{" "}
                            {selectedStudentData
                              ? selectedStudentData.name
                              : selectedBatchData?.name}
                          </DialogDescription>
                        </DialogHeader>

                        {transactionsWithBalance?.map((transaction) => (
                          <div
                            key={transaction._id}
                            className="border rounded-lg p-4 break-inside-avoid"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge
                                variant={
                                  transaction.type === "Deposit"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {transaction.type === "Deposit" ? transactionLabels.deposit : transactionLabels.withdrawal}
                              </Badge>
                              <div className="flex items-center gap-2 text-sm text-accent-foreground">
                                <Calendar className="h-4 w-4" />
                                {formatDate(transaction.date)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-bold text-lg">
                                  {transaction.type === "Deposit" ? "+" : "-"}₹
                                  {(transaction.amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm text-muted-foreground mr-2">
                                  Balance:
                                </span>
                                <span
                                  className={`font-bold text-lg ${transaction.balanceAfter < 0
                                    ? "text-destructive"
                                    : "text-green-600"
                                    }`}
                                >
                                  ₹{transaction.balanceAfter.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-800">
                                {transaction.note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <div className="flex items-center justify-between w-full gap-2">
                          <Button
                            variant="default"
                            onClick={handleDownloadPDF}
                            className="md:hidden"
                          >
                            Download
                          </Button>
                          <Button
                            onClick={handlePrint}
                            className="hidden md:flex btn-print"
                          >
                            Print
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={showBalanceDialog}
                    onOpenChange={setShowBalanceDialog}
                  >
                    <DialogTrigger asChild>
                      {!department && (
                        <Button variant="outline" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          View All Students Balance
                        </Button>
                      )}
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh]">
                      <div
                        className="max-h-full overflow-y-auto hide-scrollbar "
                        ref={allStudentsFundRef}
                      >
                        <DialogHeader>
                          <DialogTitle>All Students Balance</DialogTitle>
                          <DialogDescription>
                            Review the current fund balance for each student of{" "}
                            {selectedBatchData?.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-between border border-border items-center bg-accent/10 p-2 rounded-md my-4">
                          <span className="text-base font-medium text-muted-foreground">
                            Total Balance
                          </span>
                          <span className="text-lg font-extrabold text-primary">
                            {allStudentBalance?.toFixed(2)}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table className="border border-border w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allStudentsFund.map((student) => (
                                <TableRow
                                  key={student._id}
                                  className="break-inside-avoid"
                                >
                                  <TableCell>
                                    {student.studentId?.name 
                                      ? `${student.studentId.name} (${student.studentId.studentSpecificField?.admissionNumber || student.studentId._id})`
                                      : selectedBatchData?.name}
                                  </TableCell>
                                  <TableCell>
                                    {student.balance?.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="default"
                          onClick={handleAllStudentsFundDownloadPDF}
                          className="md:hidden"
                        >
                          Download
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleAllStudentsFundPrint}
                          className="hidden md:flex"
                        >
                          Print
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  {!department && selectedStudents.length !== 1 && (
                    <div className="text-center text-accent-foreground py-8 space-y-4">
                      <History className="h-12 w-12 mx-auto opacity-50" />
                      <p>Select a student to view transaction history</p>
                    </div>
                  )}

                  {selectedStudents.length === 1 && department && (
                    <div className="space-y-4">
                      <div className="max-h-[320px] overflow-y-auto hide-scrollbar">
                        {transactionsWithBalance?.length > 0 ? (
                          transactionsWithBalance?.slice(0, 5).map((transaction) => (
                            <div
                              key={transaction._id}
                              className="border-b pb-4 mb-4 last:border-b-0"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant={
                                    transaction.type === "Deposit"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {transaction.type === "Deposit" ? transactionLabels.deposit : transactionLabels.withdrawal}
                                </Badge>
                                <span className="text-sm text-accent-foreground">
                                  {formatDate(transaction.date)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="font-semibold text-lg">
                                  {transaction.type === "Deposit" ? "+" : "-"}₹
                                  {(transaction.amount || 0).toLocaleString()}
                                </p>
                                <p
                                  className={`font-bold text-base ${transaction.balanceAfter < 0
                                    ? "text-destructive"
                                    : "text-green-600"
                                    }`}
                                >
                                  Bal: ₹{transaction.balanceAfter.toLocaleString()}
                                </p>
                              </div>
                              <p className="text-sm text-accent-foreground mb-1">
                                {transaction.note}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-accent-foreground py-8">
                            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No transactions found</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 btn-print"
                          onClick={handlePrint}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        {selectedStudentData && (
                          <Button
                            variant="outline"
                            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => setShowClearHistoryDialogue(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedBatch && (
                    <Dialog
                      open={showBalanceDialog}
                      onOpenChange={setShowBalanceDialog}
                    >
                      <DialogTrigger asChild>
                        {!department && (
                          <Button variant="outline" className="w-full">
                            <FileText className="h-4 w-4 mr-2" />
                            View All Students Balance
                          </Button>
                        )}
                      </DialogTrigger>
                      {/* ... rest of balance dialog ... */}
                      <DialogContent className="max-w-4xl h-[80vh]">
                        <div
                          className="max-h-full overflow-y-auto hide-scrollbar "
                          ref={allStudentsFundRef}
                        >
                          <DialogHeader>
                            <DialogTitle>All Students Balance</DialogTitle>
                            <DialogDescription>
                              Review the current fund balance for each student
                              of {selectedBatchData?.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-between border border-border items-center bg-accent/10 p-2 rounded-md my-4">
                            <span className="text-base font-medium text-muted-foreground">
                              Total Balance
                            </span>
                            <span className="text-lg font-extrabold text-primary">
                              {allStudentBalance?.toFixed(2)}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <Table className="border border-border w-full">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead>Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allStudentsFund.map((student) => (
                                  <TableRow
                                    key={student._id}
                                    className="break-inside-avoid"
                                  >
                                    <TableCell>
                                      {student.studentId?.name 
                                        ? `${student.studentId.name} (${student.studentId.studentSpecificField?.admissionNumber || student.studentId._id})`
                                        : selectedBatchData?.name}
                                    </TableCell>
                                    <TableCell>
                                      {student.balance?.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="default"
                            onClick={handleAllStudentsFundDownloadPDF}
                            className="md:hidden"
                          >
                            Download
                          </Button>
                          <Button
                            onClick={handleAllStudentsFundPrint}
                            className="hidden md:flex btn-print"
                          >
                            Print
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            finalConfirmButtonRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {transactionType.toLowerCase()} ₹{amount}{" "}
              {transactionType === "Deposit" ? "to" : "from"}{" "}
              {selectedStudents.length > 1
                ? `${selectedStudents.length} selected students`
                : selectedStudentData
                  ? selectedStudentData.name
                  : selectedBatchData?.name}
              's account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              ref={cancelButtonRef}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  finalConfirmButtonRef.current?.focus();
                }
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              ref={finalConfirmButtonRef}
              onClick={confirmTransaction}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  cancelButtonRef.current?.focus();
                }
              }}
              className={
                transactionType === "Withdrawal"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Print Content */}
      <div className="hidden">
        <div ref={printRef} className="p-8 space-y-4">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-2xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">
              {selectedStudentData
                ? `Student: ${selectedStudentData.name}`
                : `Batch: ${selectedBatchData?.name}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Report Generated on {currentDate}
            </p>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance?.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>
                      {transaction.type === "Deposit" ? transactionLabels.deposit : transactionLabels.withdrawal}
                    </TableCell>
                    <TableCell>
                      {transaction.type === "Deposit" ? "+" : "-"}₹
                      {(transaction.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ₹{transaction.balanceAfter.toLocaleString()}
                    </TableCell>
                    <TableCell>{transaction.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Clear History Confirmation Dialog */}
      <Dialog
        open={showClearHistoryDialogue}
        onOpenChange={setShowClearHistoryDialogue}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear History</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear the history
              for {selectedStudentData?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialogue(false)}
            >
              Cancel
            </Button>
            <Button
              className="!bg-destructive !text-destructive-foreground"
              onClick={handleClearHistory}
              disabled={updateStudentFund.isPending}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Quick Payment Dialog */}
      <Dialog
        open={showQuickPaymentDialog}
        onOpenChange={setShowQuickPaymentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from {quickPaymentData?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Current Balance:</span>
              <span
                className={`font-bold ${quickPaymentData?.currentBalance < 0
                  ? "text-destructive"
                  : "text-green-600"
                  }`}
              >
                ₹ {quickPaymentData?.currentBalance?.toFixed(2)}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-amount">Amount Received (₹)</Label>
              <Input
                id="quick-amount"
                type="number"
                placeholder="Enter amount"
                value={quickPaymentAmount}
                onChange={(e) => setQuickPaymentAmount(e.target.value)}
                min="1"
                step="0.01"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleQuickPayment();
                  }
                }}
              />
            </div>
            {quickPaymentAmount && (
              <div className="flex justify-between items-center text-sm border-t pt-2">
                <span className="font-medium">New Balance Preview:</span>
                <span className="font-bold">
                  ₹{" "}
                  {(
                    (quickPaymentData?.currentBalance || 0) +
                    parseFloat(quickPaymentAmount || 0)
                  ).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuickPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickPayment}
              disabled={!quickPaymentAmount || loading}
            >
              {loading ? "Processing..." : "Confirm Received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Scan a student barcode to look up their fund details.
            </DialogDescription>
          </DialogHeader>
          {showScanner && (
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setShowScanner(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsFund;
