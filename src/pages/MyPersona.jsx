import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriorityEditor from "@/components/persona/PriorityEditor";
import PersonaBrowser from "@/components/persona/PersonaBrowser";
import { SlidersHorizontal, Users } from "lucide-react";

export default function MyPersona() {
  const [params] = useSearchParams();
  const initial = params.get("tab") === "library" ? "library" : "priorities";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">My Persona</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Fine-tune your own priorities and hard filters, or browse preset personas.</p>

      <Tabs defaultValue={initial}>
        <TabsList>
          <TabsTrigger value="priorities"><SlidersHorizontal className="h-4 w-4 mr-1.5" /> My priorities</TabsTrigger>
          <TabsTrigger value="library"><Users className="h-4 w-4 mr-1.5" /> Persona library</TabsTrigger>
        </TabsList>
        <TabsContent value="priorities" className="mt-4"><PriorityEditor /></TabsContent>
        <TabsContent value="library" className="mt-4"><PersonaBrowser /></TabsContent>
      </Tabs>
    </div>
  );
}