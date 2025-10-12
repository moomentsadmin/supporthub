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
  ArrowLeft,
  Database,
  FileImage,
  Clock,
  Users
} from "lucide-react";
import { Link } from "wouter";
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
      setImportStats(data.stats);
      setImportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Import completed successfully',
        totalRecords: data.stats.ticketsImported,
        processedRecords: data.stats.ticketsImported,
        errors: data.errors || [],
        warnings: data.warnings || []
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.stats.ticketsImported} tickets`,
      });
    },
    onError: (error: Error) => {
      setImportProgress({
        stage: 'error',
        progress: 0,
        message: error.message,
        totalRecords: 0,
        processedRecords: 0,
        errors: [error.message],
        warnings: []
      });
      
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("csv_file", csvFile);
    if (attachmentsZip) {
      formData.append("attachments_zip", attachmentsZip);
    }
    formData.append("import_mode", data.importMode);
    formData.append("skip_duplicates", data.skipDuplicates.toString());
    formData.append("preserve_ids", data.preserveIds.toString());

    setImportProgress({
      stage: 'uploading',
      progress: 0,
      message: 'Uploading files...',
      totalRecords: 0,
      processedRecords: 0,
      errors: [],
      warnings: []
    });

    importMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const csvContent = `id,subject,description,status,priority,customer_email,customer_name,agent_email,created_at,updated_at,channel,tags,attachments
1,"Sample Ticket","This is a sample ticket description",open,medium,customer@example.com,"John Doe",agent@example.com,2024-01-01T10:00:00Z,2024-01-01T10:00:00Z,email,"bug,urgent","attachment1.pdf;attachment2.jpg"
2,"Another Ticket","Another sample description",resolved,high,jane@example.com,"Jane Smith",agent2@example.com,2024-01-02T11:00:00Z,2024-01-02T12:00:00Z,chat,"feature,enhancement",""`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freshdesk_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Freshdesk Import
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Import tickets and attachments from Freshdesk CSV export
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">Import Data</TabsTrigger>
            <TabsTrigger value="progress">Import Progress</TabsTrigger>
            <TabsTrigger value="help">Help & Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Import Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="csv_file">Tickets CSV File *</Label>
                        <Input
                          id="csv_file"
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          CSV export from Freshdesk containing ticket data
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="attachments_zip">Attachments ZIP (Optional)</Label>
                        <Input
                          id="attachments_zip"
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

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="import_mode">Import Mode</Label>
                        <select
                          {...register("importMode")}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="tickets_only">Tickets Only</option>
                          <option value="tickets_and_customers">Tickets + Customers</option>
                          <option value="full_import">Full Import (All Data)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            {...register("skipDuplicates")}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Skip duplicate tickets</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            {...register("preserveIds")}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Preserve original ticket IDs</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadTemplate}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="submit"
                      disabled={importMutation.isPending || !csvFile}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importMutation.isPending ? "Importing..." : "Start Import"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {importProgress ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Import Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{importProgress.message}</span>
                      <span>{importProgress.progress}%</span>
                    </div>
                    <Progress value={importProgress.progress} className="w-full" />
                    {importProgress.totalRecords > 0 && (
                      <div className="text-sm text-gray-600">
                        {importProgress.processedRecords} of {importProgress.totalRecords} records processed
                      </div>
                    )}
                  </div>

                  {importProgress.stage === 'complete' && importStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{importStats.ticketsImported}</div>
                        <div className="text-sm text-gray-600">Tickets Imported</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{importStats.customersCreated}</div>
                        <div className="text-sm text-gray-600">Customers Created</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{importStats.attachmentsImported}</div>
                        <div className="text-sm text-gray-600">Attachments</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{importStats.warnings}</div>
                        <div className="text-sm text-gray-600">Warnings</div>
                      </div>
                    </div>
                  )}

                  {importProgress.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Errors occurred during import:</div>
                          {importProgress.errors.map((error, index) => (
                            <div key={index} className="text-sm">• {error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {importProgress.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Warnings:</div>
                          {importProgress.warnings.map((warning, index) => (
                            <div key={index} className="text-sm">• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Import in Progress
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Start an import from the Import Data tab to see progress here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="help" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>CSV Format Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Required Columns:</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <code>subject</code> - Ticket title</li>
                      <li>• <code>description</code> - Ticket description</li>
                      <li>• <code>customer_email</code> - Customer email address</li>
                      <li>• <code>status</code> - open, in-progress, resolved, closed</li>
                      <li>• <code>priority</code> - low, medium, high</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Optional Columns:</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <code>id</code> - Original ticket ID</li>
                      <li>• <code>customer_name</code> - Customer display name</li>
                      <li>• <code>agent_email</code> - Assigned agent email</li>
                      <li>• <code>created_at</code> - Creation timestamp</li>
                      <li>• <code>updated_at</code> - Last update timestamp</li>
                      <li>• <code>channel</code> - email, chat, phone, etc.</li>
                      <li>• <code>tags</code> - Comma-separated tags</li>
                      <li>• <code>attachments</code> - Semicolon-separated filenames</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileImage className="w-5 h-5" />
                    <span>Attachment Guidelines</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">ZIP File Structure:</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm font-mono">
                      attachments.zip<br/>
                      ├── ticket_1/<br/>
                      │   ├── document.pdf<br/>
                      │   └── image.jpg<br/>
                      ├── ticket_2/<br/>
                      │   └── file.txt<br/>
                      └── ...
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Supported Formats:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">.pdf</Badge>
                      <Badge variant="secondary">.doc/.docx</Badge>
                      <Badge variant="secondary">.jpg/.png</Badge>
                      <Badge variant="secondary">.txt</Badge>
                      <Badge variant="secondary">.zip</Badge>
                      <Badge variant="secondary">And more...</Badge>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Maximum file size: 10MB per attachment. 
                      Folder names should match ticket IDs in the CSV.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}