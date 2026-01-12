import Header from '@/components/Header';
import StructuredSearch from '@/components/StructuredSearch';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <StructuredSearch />
      </div>
    </div>
  );
}
