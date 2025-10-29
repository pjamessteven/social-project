"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VideoSubmitForm() {
  const [url, setUrl] = useState('');
  const [sex, setSex] = useState<'m' | 'f'>('f');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/videos/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, sex }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Video submitted successfully! It will be reviewed before appearing on the site.' });
        setUrl('');
        setSex('f');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit video' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Submit a Video</CardTitle>
        <CardDescription>
          Share a YouTube video about transition or detransition experiences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Author's Sex</Label>
            <RadioGroup value={sex} onValueChange={(value) => setSex(value as 'm' | 'f')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="f" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="m" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
            </RadioGroup>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Video'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
