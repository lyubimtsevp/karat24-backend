import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/utils";
import { deleteFilesWorkflow } from "@medusajs/medusa/core-flows";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { file_key } = req.body as { file_key: string };

  if (!file_key || typeof file_key !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "`file_key` is required.",
    );
  }

  try {
    const workflow = deleteFilesWorkflow(req.scope);

    await workflow.run({
      input: { ids: [file_key] },
    });

    console.log(`[API] Файл с ключом ${file_key} успешно удален.`);

    res.status(200).json({
      id: file_key,
      object: "file",
      deleted: true,
    });
  } catch (error) {
    console.error(
      `[API] Ошибка при удалении файла с ключом ${file_key}:`,
      error,
    );

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to delete file: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}
