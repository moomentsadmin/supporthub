import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Database,
  FileImage,
  Clock,
  Users
} from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImportProgress {
  stage: 'uploading' | 'parsing' | 'importing' | 'complete' | 'error';
  progress: number;
  message: string;
  totalRecords: number;
  processedRecords: number;
  errors: string[];
  warnings: string[];
}

interface ImportStats {
  ticketsImported: number;
  customersCreated: number;
  attachmentsImported: number;
  errors: number;
  warnings: number;
}

export default function FreshdeskImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [attachmentsZip, setAttachmentsZip] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      importMode: "tickets_only",
      skipDuplicates: true,
      preserveIds: false,
    },
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/freshdesk-import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportStats(data);
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.ticketsImported} tickets`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (data: any) => {
    if (!csvFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("csvFile", csvFile);
    if (attachmentsZip) {
      formData.append("attachmentsZip", attachmentsZip);
    }
    formData.append("importMode", data.importMode);
    formData.append("skipDuplicates", String(data.skipDuplicates));
    formData.append("preserveIds", String(data.preserveIds));

    importMutation.mutate(formData);
  };

  return (
    <AdminLayout title="Import Data">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Freshdesk Data Import</h2>
          <p className="mt-2 text-gray-600">
            Import your existing support data from Freshdesk CSV exports
          </p>
        </div>

        <Tabs defaultValue="upload" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Data</TabsTrigger>
            <TabsTrigger value="progress" disabled={!importProgress}>Progress</TabsTrigger>
            <TabsTrigger value="results" disabled={!importStats}>Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  File Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(handleFileUpload)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="csvFile">CSV File (Required)</Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Export your tickets from Freshdesk as CSV
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="attachmentsZip">Attachments ZIP (Optional)</Label>
                      <Input
                        id="attachmentsZip"
                        type="file"
                        accept=".zip"
                        onChange={(e) => setAttachmentsZip(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        ZIP file containing ticket attachments
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">Import Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="importMode">Import Mode</Label>
                        <select
                          {...register("importMode")}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                          <option value="tickets_only">Tickets Only</option>
                          <option value="full_import">Full Import (Tickets + Customers)</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          {...register("skipDuplicates")}
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <Label>Skip Duplicates</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          {...register("preserveIds")}
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <Label>Preserve IDs</Label>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!csvFile || importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Start Import
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {importProgress && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{importProgress.message}</span>
                      <span>{importProgress.progress}%</span>
                    </div>
                    <Progress value={importProgress.progress} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Records:</span>
                      <span className="font-medium ml-2">{importProgress.totalRecords}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processed:</span>
                      <span className="font-medium ml-2">{importProgress.processedRecords}</span>
                    </div>
                  </div>

                  {importProgress.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {importProgress.errors.length} error(s) occurred during import
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {importStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Imported</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{importStats.ticketsImported}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Customers Created</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{importStats.customersCreated}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Attachments</CardTitle>
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{importStats.attachmentsImported}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Errors</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}