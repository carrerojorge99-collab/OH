import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ClipboardList, 
  StickyNote, 
  Paperclip, 
  ClipboardCheck 
} from 'lucide-react';

const ProjectDailyLogs = ({ projectId, projectName, users = [] }) => {
  const [activeTab, setActiveTab] = useState('work-logs');

  // Work Logs Tab Content - Empty placeholder
  const renderWorkLogs = () => {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Work Logs</p>
          <p className="text-sm text-gray-400 mt-2">Contenido pendiente</p>
        </CardContent>
      </Card>
    );
  };

  // Notes Tab Content - Empty placeholder
  const renderNotes = () => {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <StickyNote className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Notes</p>
          <p className="text-sm text-gray-400 mt-2">Contenido pendiente</p>
        </CardContent>
      </Card>
    );
  };

  // Attachments Tab Content - Empty placeholder
  const renderAttachments = () => {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Paperclip className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Attachments</p>
          <p className="text-sm text-gray-400 mt-2">Contenido pendiente</p>
        </CardContent>
      </Card>
    );
  };

  // Survey Tab Content - Empty placeholder
  const renderSurvey = () => {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Survey</p>
          <p className="text-sm text-gray-400 mt-2">Contenido pendiente</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="work-logs" className="text-xs sm:text-sm" data-testid="daily-logs-work-logs-tab">
            <ClipboardList className="w-4 h-4 mr-1 hidden sm:inline" />
            Work Logs
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs sm:text-sm" data-testid="daily-logs-notes-tab">
            <StickyNote className="w-4 h-4 mr-1 hidden sm:inline" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="attachments" className="text-xs sm:text-sm" data-testid="daily-logs-attachments-tab">
            <Paperclip className="w-4 h-4 mr-1 hidden sm:inline" />
            Attachments
          </TabsTrigger>
          <TabsTrigger value="survey" className="text-xs sm:text-sm" data-testid="daily-logs-survey-tab">
            <ClipboardCheck className="w-4 h-4 mr-1 hidden sm:inline" />
            Survey
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-logs" className="mt-6">
          {renderWorkLogs()}
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          {renderNotes()}
        </TabsContent>

        <TabsContent value="attachments" className="mt-6">
          {renderAttachments()}
        </TabsContent>

        <TabsContent value="survey" className="mt-6">
          {renderSurvey()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDailyLogs;
