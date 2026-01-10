'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { testConnection } from '@/lib/ai/providers';
import type { AIProviderName } from '@/types/ai';

const MODELS = {
  anthropic: [
    { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  ],
  gemini: [
    { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  ],
  openrouter: [
    { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
    { value: 'google/gemini-3-flash', label: 'Gemini 3 Flash' },
    { value: 'google/gemini-2.5-flash-lite-preview-09-2025', label: 'Gemini 2.5 Flash Lite' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano' },
    { value: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
    { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast' },
    { value: 'mistralai/devstral-2512', label: 'Devstral 2512' },
    { value: 'minimax/minimax-m2', label: 'Minimax M2' },
    { value: 'xiaomi/mimo-v2-flash:free', label: 'Mimo v2 Flash (Free)' },
  ],
};

export default function SettingsPanel() {
  const [provider, setProvider] = useState<AIProviderName>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const savedProvider = localStorage.getItem('ai-provider') as AIProviderName;
    const savedModel = localStorage.getItem(`ai-model-${provider}`);
    const savedApiKey = localStorage.getItem(`api-key-${provider}`);

    if (savedProvider) {
      setProvider(savedProvider);
    }
    if (savedModel) {
      setModel(savedModel);
    } else {
      // Set default model for provider
      setModel(MODELS[provider][0].value);
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [provider]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    if (!model) {
      setTestResult({ success: false, message: 'Please select a model' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testConnection(provider, apiKey, model);

    if (result.success) {
      setTestResult({ success: true, message: '✓ Connection successful! Settings saved.' });

      // Auto-save settings on successful connection
      localStorage.setItem('ai-provider', provider);
      localStorage.setItem(`ai-model-${provider}`, model);
      localStorage.setItem(`api-key-${provider}`, apiKey);
      localStorage.setItem('connection-status', 'connected');
      localStorage.setItem('connection-provider', provider);

      // Trigger custom event to update status indicator
      window.dispatchEvent(new Event('connection-status-changed'));
    } else {
      setTestResult({ success: false, message: `✗ ${result.error || 'Connection failed'}` });
      localStorage.setItem('connection-status', 'disconnected');
    }

    setTesting(false);
  };

  const handleSave = () => {
    localStorage.setItem('ai-provider', provider);
    localStorage.setItem(`ai-model-${provider}`, model);
    localStorage.setItem(`api-key-${provider}`, apiKey);

    // If we haven't tested yet, mark as unconfigured
    if (!testResult) {
      localStorage.setItem('connection-status', 'unconfigured');
    }

    window.dispatchEvent(new Event('connection-status-changed'));
  };

  const handleClearAll = () => {
    localStorage.clear();
    setApiKey('');
    setTestResult(null);
    window.dispatchEvent(new Event('connection-status-changed'));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Settings</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="text-base text-yellow-900 dark:text-yellow-100">
                ⚠️ Security Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
              <p>API keys are stored in your browser's localStorage.</p>
              <p>• Do not use this app on shared or public computers</p>
              <p>• API keys are sent directly to AI providers (not our servers)</p>
              <p>• Consider using API keys with usage limits</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                AI Provider
              </label>
              <Select value={provider} onValueChange={(value) => setProvider(value as AIProviderName)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="gemini">Google (Gemini)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS[provider].map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                API Key for {provider}
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null); // Clear test result when key changes
                }}
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !apiKey.trim()}
                className="w-full"
              >
                {testing ? 'Testing...' : 'Test Connection & Save'}
              </Button>
              <Button onClick={handleSave} variant="outline" className="w-full">
                Save Without Testing
              </Button>
            </div>

            {testResult && (
              <Card className={testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}>
                <CardContent className="pt-4">
                  <p className={testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    {testResult.message}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleClearAll}
                className="w-full"
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
