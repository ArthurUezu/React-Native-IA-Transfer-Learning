import * as tf from '@tensorflow/tfjs'
export class DataSet {
  IMG_WIDTH = 32
  IMG_HEIGHT = 32
  TRAIN_IMAGES = []
  TRAIN_LABLES;
  TEST_IMAGES = []
  TEST_LABLES;
  NUM_CLASSES = 10
  DATA_PRE_NUM = 10000

  get IMAGE_SIZE () {
    return this.IMG_WIDTH * this.IMG_HEIGHT * 3
  }

  trainDatas = []
  testDatas = []
  trainLables
  testLables = []

  trainM = 0
  testM = 0
  trainIndices;
  testIndices;
  shuffledTrainIndex = 0;
  shuffledTestIndex = 0

  currentTrainIndex = 0

  getPath (src) {
  }

  loadImg (src) {
  }

  loadImages (srcs) {
  }

  async load () {
  }

  nextBatch (batchSize, [data, lables], index) {
    const batchImagesArray = new Float32Array(batchSize * this.IMAGE_SIZE)
    const batchLabelsArray = new Uint8Array(batchSize * this.NUM_CLASSES)

    const batchLables = []

    for (let i = 0; i < batchSize; i++) {
      const idx = index()
      const currentIdx = idx % this.DATA_PRE_NUM
      const dataIdx = Math.floor(idx / this.DATA_PRE_NUM)

      const image =
          data[dataIdx].slice(currentIdx * this.IMAGE_SIZE, currentIdx * this.IMAGE_SIZE + this.IMAGE_SIZE)
      batchImagesArray.set(image, i * this.IMAGE_SIZE)
      batchLables.push(lables[idx])
    }
    const xs = tf.tensor2d(batchImagesArray, [batchSize, this.IMAGE_SIZE])
    const ys = tf.oneHot(batchLables, this.NUM_CLASSES)

    return { xs, ys }
  }

  nextTrainBatch (batchSize = this.trainM) {
    this.shuffledTrainIndex = (this.shuffledTrainIndex + 1) % this.trainIndices.length

    return this.nextBatch(
      batchSize, [this.trainDatas, this.trainLables], () => {
        this.shuffledTrainIndex =
            (this.shuffledTrainIndex + 1) % this.trainIndices.length
        return this.trainIndices[this.shuffledTrainIndex]
      })
  }

  nextTestBatch (batchSize = this.testM) {
    this.shuffledTestIndex = (this.shuffledTestIndex + 1) % this.testIndices.length

    return this.nextBatch(
      batchSize, [this.testDatas, this.testLables], () => {
        this.shuffledTestIndex =
            (this.shuffledTestIndex + 1) % this.testIndices.length
        return this.testIndices[this.shuffledTestIndex]
      })
  }
}
