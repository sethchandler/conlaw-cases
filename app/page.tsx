'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QueryBuilder from '@/components/QueryBuilder';
import ChatInterface from '@/components/ChatInterface';
import SettingsPanel from '@/components/SettingsPanel';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">ConLaw Cases</h1>
              <p className="text-sm text-muted-foreground">
                Constitutional Law Database
              </p>
            </div>
            <SettingsPanel />
          </div>
          <ConnectionStatus />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="query" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="query">Query Builder</TabsTrigger>
            <TabsTrigger value="chat">Chat Mode</TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="mt-0">
            <QueryBuilder />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <ChatInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
