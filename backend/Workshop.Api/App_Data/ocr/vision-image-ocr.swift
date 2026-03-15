import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else {
    fputs("Missing image path\n", stderr)
    exit(2)
}

let imagePath = args[1]
guard let image = NSImage(contentsOfFile: imagePath) else {
    fputs("Unable to load image\n", stderr)
    exit(3)
}

var rect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
    fputs("Unable to create CGImage\n", stderr)
    exit(4)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en_US"]

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
    let observations = request.results ?? []
    let lines = observations.compactMap { $0.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    print(lines.joined(separator: "\n"))
} catch {
    fputs("Vision OCR failed: \(error)\n", stderr)
    exit(5)
}