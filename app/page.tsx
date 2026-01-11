'use client';

import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StructuredSearch from '@/components/StructuredSearch';
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
            <div className="flex items-center gap-4">
              <Image
                src="/con-law-cases-app-icon.png"
                alt="ConLaw Cases"
                width={64}
                height={64}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold">ConLaw Cases</h1>
                <p className="text-sm text-muted-foreground">
                  Constitutional Law Database
                </p>
                <p className="text-xs text-muted-foreground">
                  Professor Seth J. Chandler, University of Houston Law Center
                </p>
              </div>
            </div>
            <SettingsPanel />
          </div>
          <ConnectionStatus />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-8">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="query">AI Query</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <StructuredSearch />
          </TabsContent>

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
