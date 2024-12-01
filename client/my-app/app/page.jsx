"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  RefreshCw,
  MailOpen,
  AlertCircle,
  Download,
  Eye,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const AttachmentPreview = ({ attachment, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attachment) return;

    let previewCleanup = null;

    const fetchPreview = async () => {
      setPreviewUrl(null);
      setError(null);

      try {
        console.log("Previewing Attachment:", attachment);

        const previewUrl = new URL("http://localhost:5000/api/emails/preview");
        previewUrl.searchParams.append("filename", attachment.filename);

        const response = await fetch(previewUrl.toString(), {
          method: "GET",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);

        previewCleanup = () => {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        };
      } catch (error) {
        console.error("Preview Fetch Error:", error);
        setError(error.message || "Unable to preview file");
      }
    };

    fetchPreview();

    return () => {
      if (previewCleanup) {
        previewCleanup();
      }
    };
  }, [attachment]);

  const renderPreview = () => {
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }

    const fileType = attachment.contentType.split("/")[0];

    switch (fileType) {
      case "image":
        return (
          <img
            src={previewUrl}
            alt={attachment.filename}
            className="max-w-full max-h-[500px] object-contain"
          />
        );
      case "application":
        if (attachment.contentType === "application/pdf") {
          return (
            <iframe
              src={previewUrl}
              width="100%"
              height="500px"
              title={attachment.filename}
            />
          );
        }
        return <p>Preview not available for this file type.</p>;
      default:
        return <p>Preview not available for this file type.</p>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{attachment.filename}</DialogTitle>
          <DialogDescription>
            File size: {(attachment.size / 1024).toFixed(2)} KB
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[600px] overflow-auto">
          {previewUrl ? (
            renderPreview()
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            "Loading preview..."
          )}
        </div>
        {attachment.extractedText && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Extracted Text:</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {attachment.extractedText}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AttachmentList = ({ attachments, onDownload, onPreview }) => {
  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            {attachment.contentType === "application/pdf" ? (
              <FileText className="w-6 h-6 text-red-500" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-400"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            <span className="text-sm text-gray-700">{attachment.filename}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPreview(attachment)}
              className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-md transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(attachment)}
              className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-2 rounded-md transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmailCard = ({ email, onDownload, onPreviewAttachment }) => {
  const extractSenderName = (sender) => {
    const nameMatch =
      sender.match(/"?([^"<]+)"?\s*</) || sender.match(/([^<]+)/);
    return nameMatch ? nameMatch[1].trim() : sender;
  };

  const senderName = extractSenderName(email.sender);
  const senderInitial = senderName[0].toUpperCase();

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden h-full">
      <div className="p-4 pb-0 flex items-center">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
          {senderInitial}
        </div>

        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800 truncate max-w-[70%]">
              {email.subject}
            </h3>

            <span
              className={`
                text-xs font-medium uppercase px-2 py-1 rounded-full
                ${
                  email.isInvoice
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }
              `}
            >
              {email.isInvoice ? "Invoice" : "Email"}
            </span>
          </div>

          <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
            <span className="truncate max-w-[200px]">{senderName}</span>
            <span className="text-gray-300">•</span>
            <time>{formatDistanceToNow(new Date(email.createdAt))} ago</time>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-4 text-xs text-gray-600 line-clamp-2 flex-grow">
        {email.body.substring(0, 150)}...
      </div>

      {email.attachments && email.attachments.length > 0 && (
        <div className="px-4 pb-4 mt-2">
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">
              Attachments
            </h4>
            <AttachmentList
              attachments={email.attachments}
              onDownload={onDownload}
              onPreview={onPreviewAttachment}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("http://localhost:5000/api/emails");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.message}`
        );
      }
      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error("Error fetching emails:", error);
      setError(`Failed to fetch emails: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("http://localhost:5000/api/emails/fetch", {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.message}`
        );
      }
      const result = await response.json();
      setMessage(result.message);
      await fetchEmails();
    } catch (error) {
      console.error("Error refreshing emails:", error);
      setError(`Failed to refresh emails: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterEmails = () => {
    switch (activeTab) {
      case "invoices":
        return emails.filter((email) => email.isInvoice);
      case "attachments":
        return emails.filter(
          (email) => email.attachments && email.attachments.length > 0
        );
      default:
        return emails;
    }
  };

  const handleDownload = async (attachment) => {
    try {
      if (!attachment || !attachment.filename) {
        console.error("Invalid attachment data:", attachment);
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/emails/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: attachment.filename }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download attachment");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      alert(`Failed to download: ${error.message}`);
    }
  };

  const handlePreviewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
  };

  const closePreview = () => {
    setSelectedAttachment(null);
  };

  return (
    // <div className="container mx-auto> <p div className="container mx-auto p-6 bg-gray-50 min-h-screen">
    <div className="max-w-4xl mx-auto my-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
          <MailOpen className="w-8 h-8 mr-3 text-blue-600" />
          Email Invoice Tracker
        </h1>
        <Button
          onClick={refreshEmails}
          variant="outline"
          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Emails
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6 bg-white shadow-sm border">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            All Emails
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="attachments"
            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
          >
            With Attachments
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
              <AlertCircle className="w-6 h-6 mr-3 text-red-500" />
              <span>{error}</span>
            </div>
          ) : filterEmails().length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Inbox className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No emails found in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filterEmails().map((email) => (
                <EmailCard
                  key={email._id}
                  email={email}
                  onDownload={handleDownload}
                  onPreviewAttachment={handlePreviewAttachment}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedAttachment && (
        <AttachmentPreview
          attachment={selectedAttachment}
          onClose={closePreview}
        />
      )}

      {message && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
          {message}
        </div>
      )}
    </div>
    // </p>
  );
}
// </ReactProject>
