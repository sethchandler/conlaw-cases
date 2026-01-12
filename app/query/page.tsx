import Header from '@/components/Header';
import QueryBuilder from '@/components/QueryBuilder';

export default function QueryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <QueryBuilder />
      </div>
    </div>
  );
}
