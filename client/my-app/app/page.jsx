"use client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Inbox, 
  RefreshCw, 
  MailOpen, 
  AlertCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const EmailCard = ({ email, onDownload }) => {
  // Extract sender name, handling complex sender formats
  const extractSenderName = (sender) => {
    // Remove quotes and extract name between quotes or before <
    const nameMatch = sender.match(/"?([^"<]+)"?\s*</) || sender.match(/([^<]+)/);
    return nameMatch ? nameMatch[1].trim() : sender;
  };

  const senderName = extractSenderName(email.sender);
  const senderInitial = senderName[0].toUpperCase();

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden h-full">
      {/* Header with sender info and invoice badge */}
      <div className="p-4 pb-0 flex items-center">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
          {senderInitial}
        </div>

        {/* Sender Details */}
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800 truncate max-w-[70%]">
              {email.subject}
            </h3>
            
            {/* Invoice/Email Label */}
            <span 
              className={`
                text-xs font-medium uppercase px-2 py-1 rounded-full
                ${email.isInvoice 
                  ? 'bg-green-50 text-green-600 border border-green-200' 
                  : 'bg-gray-50 text-gray-500 border border-gray-200'}
              `}
            >
              {email.isInvoice ? 'Invoice' : 'Email'}
            </span>
          </div>

          {/* Sender and Timestamp */}
          <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
            <span className="truncate max-w-[200px]">{senderName}</span>
            <span className="text-gray-300">•</span>
            <time>
              {formatDistanceToNow(new Date(email.createdAt))} ago
            </time>
          </div>
        </div>
      </div>

      {/* Email Body Preview */}
      <div className="px-4 pt-2 pb-4 text-xs text-gray-600 line-clamp-2 flex-grow">
        {email.body.substring(0, 150)}...
      </div>

      {/* Attachments Section */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-100 pt-3 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className="text-gray-400"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-xs text-gray-600">
                  {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
              {email.attachments.length > 0 && (
                <button 
                  onClick={() => onDownload(email.attachments[0])}
                  className="
                    text-blue-600 hover:text-blue-700 
                    bg-blue-50 hover:bg-blue-100 
                    px-2 py-1 rounded-md 
                    text-xs font-medium
                    transition-colors
                  "
                >
                  Download
                </button>
              )}
            </div>
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

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const fetchResponse = await fetch(
        "http://localhost:5000/api/emails/fetch"
      );
      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(
          `HTTP error! status: ${fetchResponse.status}, message: ${errorData.message}, error: ${errorData.error}`
        );
      }
      const fetchResult = await fetchResponse.json();
      setMessage(fetchResult.message);

      const getResponse = await fetch("http://localhost:5000/api/emails");
      if (!getResponse.ok) {
        const errorData = await getResponse.json();
        throw new Error(
          `HTTP error! status: ${getResponse.status}, message: ${errorData.message}, error: ${errorData.error}`
        );
      }
      const data = await getResponse.json();
      setEmails(data);
    } catch (error) {
      console.error("Error fetching emails:", error);
      setError(`Failed to fetch emails: ${error.message}`);
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
      if (!attachment || !attachment.filepath || !attachment.filename) {
        console.error("Invalid attachment data:", attachment);
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/emails/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attachment),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      // Create a Blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename || "downloaded_file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up the object URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
            <MailOpen className="w-8 h-8 mr-3 text-blue-600" />
            Email Invoice Tracker
          </h1>
          <Button
            onClick={fetchEmails}
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
                <p className="text-gray-500">
                  No emails found in this category
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filterEmails().map((email) => (
                  <EmailCard 
                    key={email._id} 
                    email={email} 
                    onDownload={handleDownload} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Optional: Message Display */}
        {message && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}