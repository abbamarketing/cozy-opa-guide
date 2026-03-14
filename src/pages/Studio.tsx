import { useState, useEffect } from "react";
import StudioScriptPipeline from "@/components/studio/StudioScriptPipeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, Camera, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const Studio = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPipeline, setShowPipeline] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoEmail, setPhotoEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const { data } = await supabase
        .from("studio_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .maybeSingle();
      setCredits(data?.credits_remaining ?? 0);
      setLoading(false);
    };
    fetchCredits();
  }, [user]);

  const daysUntilRenewal = () => {
    const now = new Date();
    const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((nextFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handlePhotoInterest = async () => {
    if (!photoEmail.trim()) {
      toast.error("Informe seu e-mail");
      return;
    }
    setSubmittingEmail(true);
    const { error } = await supabase.from("studio_photo_interest").insert({
      email: photoEmail.trim(),
      user_id: user?.id || null,
    });
    setSubmittingEmail(false);
    if (error) {
      toast.error("Erro ao registrar interesse");
    } else {
      toast.success("Pronto! Vamos te avisar quando lançar 🎉");
      setPhotoDialogOpen(false);
      setPhotoEmail("");
    }
  };

  if (showPipeline) {
    return (
      <div className="min-h-screen bg-background p-6">
        <StudioScriptPipeline />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Studio
          </h1>
        </div>

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge
            variant={credits === 0 ? "destructive" : "secondary"}
            className="text-sm px-3 py-1"
          >
            {credits === 0
              ? `0 créditos — renova em ${daysUntilRenewal()} dias`
              : `${credits} de 10 créditos disponíveis este mês`}
          </Badge>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        {/* Criar Roteiro */}
        <Card
          className="group cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setShowPipeline(true)}
        >
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-xl bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Criar Roteiro
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie roteiros profissionais com IA em 5 passos
            </p>
            <Button size="sm" className="mt-2">
              Começar
            </Button>
          </CardContent>
        </Card>

        {/* Ensaio Fotográfico */}
        <Card
          className="relative cursor-default border-border bg-card opacity-80"
          onClick={() => setPhotoDialogOpen(true)}
        >
          <Badge className="absolute right-3 top-3 bg-muted text-muted-foreground">
            Em breve
          </Badge>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-xl bg-muted p-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Ensaio Fotográfico
            </h2>
            <p className="text-sm text-muted-foreground">
              Gere fotos profissionais com IA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Photo interest dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ensaio Fotográfico com IA</DialogTitle>
            <DialogDescription>
              Esta funcionalidade está sendo desenvolvida. Quer ser avisado quando
              lançar?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="seu@email.com"
              type="email"
              value={photoEmail}
              onChange={(e) => setPhotoEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePhotoInterest()}
            />
            <Button onClick={handlePhotoInterest} disabled={submittingEmail}>
              {submittingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Me avisar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Studio;
