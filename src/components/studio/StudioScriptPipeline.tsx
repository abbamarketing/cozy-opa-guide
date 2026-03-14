import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface ScriptFormData {
  content_type: string;
  topic: string;
  objective: string;
  tone: string;
  audience: string;
  audience_level: string;
  reference: string;
  keywords: string;
}

const INITIAL_DATA: ScriptFormData = {
  content_type: "",
  topic: "",
  objective: "",
  tone: "",
  audience: "",
  audience_level: "",
  reference: "",
  keywords: "",
};

const TOTAL_STEPS = 5;

const StudioScriptPipeline = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ScriptFormData>(INITIAL_DATA);

  const update = (field: keyof ScriptFormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    switch (currentStep) {
      case 1:
        return !!formData.content_type;
      case 2:
        return !!formData.topic && !!formData.objective && !!formData.tone;
      case 3:
        return !!formData.audience && !!formData.audience_level;
      default:
        return false;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Passo {currentStep} de {TOTAL_STEPS}</span>
          <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-6">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Tipo de Conteúdo
              </h2>
              <p className="text-sm text-muted-foreground">
                Que tipo de vídeo você quer criar?
              </p>
              <RadioGroup
                value={formData.content_type}
                onValueChange={(v) => update("content_type", v)}
                className="space-y-3"
              >
                <label
                  htmlFor="short"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="short_video" id="short" className="mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Short Video (até 90s)</p>
                    <p className="text-sm text-muted-foreground">
                      Instagram Reels, YouTube Shorts, TikTok
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="youtube"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="youtube_video" id="youtube" className="mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Vídeo YouTube (3-20 min)</p>
                    <p className="text-sm text-muted-foreground">
                      Conteúdo longo para YouTube
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Contexto do Vídeo
              </h2>

              <div className="space-y-2">
                <Label htmlFor="topic">Tema / assunto do vídeo *</Label>
                <Input
                  id="topic"
                  placeholder="Ex: Como começar a investir com pouco dinheiro"
                  value={formData.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Objetivo *</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(v) => update("objective", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educar">Educar</SelectItem>
                    <SelectItem value="vender">Vender</SelectItem>
                    <SelectItem value="entreter">Entreter</SelectItem>
                    <SelectItem value="autoridade">Gerar Autoridade</SelectItem>
                    <SelectItem value="viralizar">Viralizar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tom de voz *</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(v) => update("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direto">Direto e objetivo</SelectItem>
                    <SelectItem value="didatico">Didático</SelectItem>
                    <SelectItem value="descontraido">Descontraído</SelectItem>
                    <SelectItem value="inspiracional">Inspiracional</SelectItem>
                    <SelectItem value="provocativo">Provocativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Audiência
              </h2>

              <div className="space-y-2">
                <Label htmlFor="audience">Para quem é esse vídeo? *</Label>
                <Input
                  id="audience"
                  placeholder="Ex: Empreendedores 30-45 anos"
                  value={formData.audience}
                  onChange={(e) => update("audience", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nível de conhecimento *</Label>
                <RadioGroup
                  value={formData.audience_level}
                  onValueChange={(v) => update("audience_level", v)}
                  className="flex gap-4"
                >
                  {["iniciante", "intermediario", "avancado"].map((level) => (
                    <label
                      key={level}
                      htmlFor={level}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={level} id={level} />
                      <span className="text-sm capitalize text-foreground">
                        {level === "intermediario" ? "Intermediário" : level === "avancado" ? "Avançado" : "Iniciante"}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Steps 4-5 placeholder */}
          {currentStep > 3 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Passo {currentStep} em breve</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 1}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canAdvance()}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudioScriptPipeline;
