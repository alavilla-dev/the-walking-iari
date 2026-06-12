import type { DialogueNode, DialogueScript } from "../types";

export class DialogueRunner {
  private currentId: string | null = null;

  constructor(private script: DialogueScript) {}

  start(id: string): void {
    if (!this.script[id]) throw new Error(`Nodo de diálogo desconocido: ${id}`);
    this.currentId = id;
  }

  current(): DialogueNode | null {
    return this.currentId ? this.script[this.currentId] : null;
  }

  isFinished(): boolean {
    return this.currentId === null;
  }

  hasOptions(): boolean {
    const node = this.current();
    return !!node?.options && node.options.length > 0;
  }

  choose(optionIndex: number): void {
    const node = this.current();
    if (!node?.options) throw new Error("El nodo actual no tiene opciones");
    const opt = node.options[optionIndex];
    if (!opt) throw new Error(`Opción inválida: ${optionIndex}`);
    this.currentId = opt.goto;
  }

  advance(): void {
    const node = this.current();
    if (!node) return;
    if (node.options) throw new Error("Usá choose() en nodos con opciones");
    this.currentId = node.next ?? null;
  }
}
