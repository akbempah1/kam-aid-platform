"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

type FileUploadProps = {
  onDataParsed: (data: {
    sales: { oyarifa: string; ghanaFlag: string; madina: string };
    cogs: string;
    expenses: Record<string, string>;
    customExpenses: { id: number; name: string; amount: string }[];
  }) => void;
};

export default function FileUpload({ onDataParsed }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    setFileName(file.name);
    setStatus("idle");
    setErrorMessage("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Parse the data - looking for our expected format
      const result = {
        sales: { oyarifa: "", ghanaFlag: "", madina: "" },
        cogs: "",
        expenses: {
          salaries: "",
          rent: "",
          electricity: "",
          phone: "",
          pettyCash: "",
          maintenance: "",
          miscellaneous: ""
        },
        customExpenses: [] as { id: number; name: string; amount: string }[]
      };

      // Map of possible field names to our internal keys
      const fieldMappings: Record<string, { type: string; key: string }> = {
        // Sales
        "oyarifa": { type: "sales", key: "oyarifa" },
        "oyarifa branch": { type: "sales", key: "oyarifa" },
        "oyarifa sales": { type: "sales", key: "oyarifa" },
        "ghana flag": { type: "sales", key: "ghanaFlag" },
        "ghana flag branch": { type: "sales", key: "ghanaFlag" },
        "ghana flag sales": { type: "sales", key: "ghanaFlag" },
        "madina": { type: "sales", key: "madina" },
        "madina branch": { type: "sales", key: "madina" },
        "madina sales": { type: "sales", key: "madina" },
        // COGS
        "cogs": { type: "cogs", key: "cogs" },
        "cost of goods sold": { type: "cogs", key: "cogs" },
        "total purchases": { type: "cogs", key: "cogs" },
        "purchases": { type: "cogs", key: "cogs" },
        // Expenses
        "salaries": { type: "expense", key: "salaries" },
        "salaries & wages": { type: "expense", key: "salaries" },
        "salaries and wages": { type: "expense", key: "salaries" },
        "wages": { type: "expense", key: "salaries" },
        "rent": { type: "expense", key: "rent" },
        "electricity": { type: "expense", key: "electricity" },
        "power": { type: "expense", key: "electricity" },
        "phone": { type: "expense", key: "phone" },
        "phone & internet": { type: "expense", key: "phone" },
        "phone and internet": { type: "expense", key: "phone" },
        "internet": { type: "expense", key: "phone" },
        "petty cash": { type: "expense", key: "pettyCash" },
        "pettycash": { type: "expense", key: "pettyCash" },
        "maintenance": { type: "expense", key: "maintenance" },
        "maintenance & repairs": { type: "expense", key: "maintenance" },
        "maintenance and repairs": { type: "expense", key: "maintenance" },
        "repairs": { type: "expense", key: "maintenance" },
        "miscellaneous": { type: "expense", key: "miscellaneous" },
        "misc": { type: "expense", key: "miscellaneous" },
        "other": { type: "expense", key: "miscellaneous" },
        "other expenses": { type: "expense", key: "miscellaneous" },
      };

      // Parse rows - looking for label/value pairs
      jsonData.forEach((row) => {
        if (row.length >= 2) {
          const label = String(row[0] || "").toLowerCase().trim();
          const value = row[1];

          const mapping = fieldMappings[label];
          if (mapping) {
            const numValue = String(parseFloat(value) || "");
            if (mapping.type === "sales") {
              result.sales[mapping.key as keyof typeof result.sales] = numValue;
            } else if (mapping.type === "cogs") {
              result.cogs = numValue;
            } else if (mapping.type === "expense") {
              result.expenses[mapping.key as keyof typeof result.expenses] = numValue;
            }
          } else if (label && value && !isNaN(parseFloat(value))) {
            // Unknown expense - add as custom
            const existingKeys = Object.keys(fieldMappings);
            if (!existingKeys.includes(label)) {
              result.customExpenses.push({
                id: Date.now() + Math.random(),
                name: String(row[0]).trim(),
                amount: String(parseFloat(value) || "")
              });
            }
          }
        }
      });

      // Check if we got any data
      const hasData = 
        Object.values(result.sales).some(v => v !== "") ||
        result.cogs !== "" ||
        Object.values(result.expenses).some(v => v !== "") ||
        result.customExpenses.length > 0;

      if (hasData) {
        setStatus("success");
        onDataParsed(result);
      } else {
        setStatus("error");
        setErrorMessage("Could not find recognizable data in the file. Please check the format.");
      }

    } catch (error) {
      console.error("File parse error:", error);
      setStatus("error");
      setErrorMessage("Failed to parse file. Please ensure it's a valid Excel or CSV file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Import from File</h2>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? "border-sky-400 bg-sky-50"
            : status === "success"
            ? "border-emerald-300 bg-emerald-50"
            : status === "error"
            ? "border-red-300 bg-red-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-4">
            <FileSpreadsheet className={`w-10 h-10 ${status === "success" ? "text-emerald-500" : status === "error" ? "text-red-500" : "text-slate-400"}`} />
            <div className="text-left">
              <p className="font-medium text-slate-800">{fileName}</p>
              {status === "success" && (
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Data imported successfully
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </p>
              )}
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              Drag and drop your Excel or CSV file here
            </p>
            <p className="text-sm text-slate-400 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
        <p className="text-sm font-medium text-slate-700 mb-2">Expected Format:</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your file should have two columns: <strong>Label</strong> and <strong>Value</strong>. 
          Recognized labels include: Oyarifa, Ghana Flag, Madina (for sales), 
          COGS/Purchases, Salaries, Rent, Electricity, Phone, Petty Cash, Maintenance, Miscellaneous.
          Any unrecognized labels with numeric values will be added as custom expenses.
        </p>
      </div>
    </div>
  );
}